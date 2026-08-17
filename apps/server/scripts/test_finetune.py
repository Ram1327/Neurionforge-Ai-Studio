"""
CLI LoRA Fine-Tuning Test for NeurionForge AI Studio
Trains a LoRA adapter on Qwen2.5-1.5B-Instruct using PEFT and Hugging Face Transformers
"""
import os
import sys
import time
from pathlib import Path
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq
)
from peft import LoraConfig, get_peft_model, PeftModel

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "toy_dataset.jsonl"
ADAPTER_OUTPUT_DIR = BASE_DIR / "adapters" / "qwen-1.5b-neurionforge-v0"

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"

def format_chat_prompt(tokenizer, messages):
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)

def run_finetune():
    print("==================================================")
    print(" NeurionForge AI Studio — LoRA Fine-Tuning Test   ")
    print("==================================================")
    print(f"Base Model: {MODEL_ID}")
    print(f"Dataset:    {DATA_PATH}")
    print(f"Target Dir: {ADAPTER_OUTPUT_DIR}")
    print(f"Device:     {'cuda' if torch.cuda.is_available() else 'cpu'}")
    print("--------------------------------------------------\n")

    if not DATA_PATH.exists():
        print(f"[ERROR] Dataset not found at {DATA_PATH}")
        sys.exit(1)

    print("1. Loading Tokenizer and Base Model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model with float32 or bfloat16 for CPU compatibility
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )
    print("✓ Model and tokenizer loaded successfully.")

    print("\n2. Configuring LoRA...")
    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    peft_model = get_peft_model(model, lora_config)
    peft_model.print_trainable_parameters()

    print("\n3. Preparing Dataset...")
    raw_dataset = load_dataset("json", data_files=str(DATA_PATH), split="train")

    def preprocess_function(examples):
        texts = [format_chat_prompt(tokenizer, msgs) for msgs in examples["messages"]]
        model_inputs = tokenizer(texts, max_length=256, truncation=True, padding=True)
        model_inputs["labels"] = model_inputs["input_ids"].copy()
        return model_inputs

    tokenized_dataset = raw_dataset.map(
        preprocess_function,
        batched=True,
        remove_columns=raw_dataset.column_names
    )
    print(f"✓ Processed {len(tokenized_dataset)} training examples.")

    print("\n4. Running Training (3 Epochs)...")
    training_args = TrainingArguments(
        output_dir=str(BASE_DIR / "temp_checkpoints"),
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=2,
        learning_rate=2e-4,
        logging_steps=1,
        save_strategy="no",
        report_to="none",
        use_cpu=True
    )

    trainer = Trainer(
        model=peft_model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=DataCollatorForSeq2Seq(tokenizer, pad_to_multiple_of=8)
    )

    train_start = time.perf_counter()
    train_result = trainer.train()
    train_duration = time.perf_counter() - train_start
    print(f"\n✓ Training completed in {train_duration:.2f}s (Loss: {train_result.training_loss:.4f})")

    print(f"\n5. Saving LoRA Adapter to {ADAPTER_OUTPUT_DIR}...")
    ADAPTER_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    peft_model.save_pretrained(str(ADAPTER_OUTPUT_DIR))
    tokenizer.save_pretrained(str(ADAPTER_OUTPUT_DIR))
    print("✓ Adapter and tokenizer saved successfully.")

    print("\n6. Running Post-Training Test Inference with Adapter...")
    test_prompt = [{"role": "user", "content": "What is NeurionForge AI Studio?"}]
    formatted_input = tokenizer.apply_chat_template(test_prompt, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(formatted_input, return_tensors="pt")

    with torch.no_grad():
        outputs = peft_model.generate(**inputs, max_new_tokens=64, temperature=0.7)
    
    response_text = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    print(f"\nAdapter Response: {response_text.strip()}\n")
    print("==================================================")
    print(" ✓ Phase 0 LoRA Fine-Tuning Test PASSED           ")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_finetune()
    except Exception as e:
        print(f"\n[ERROR] Fine-tuning failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
