# lambda_function.py
import json
from litellm import completion # pyright: ignore[reportMissingImports]
import time
import os

def lambda_handler(event, context):
    # Handle both direct invocation and Function URL
    if isinstance(event.get('body'), str):
        body = json.loads(event['body'])
    else:
        body = event
    prompt = body.get('prompt', 'Hello, world!')
    
    responses = {}
    
    models = [
        "gpt-3.5-turbo",
        "claude-3-haiku-20240307", 
        "groq/llama-3.1-8b-instant"
    ]
    
    for model in models:
        # Skip models without API keys
        if "gpt" in model and not os.getenv('OPENAI_API_KEY'):
            continue
        if "claude" in model and not os.getenv('ANTHROPIC_API_KEY'):
            continue
        if "groq" in model and not os.getenv('GROQ_API_KEY'):
            continue
            
        start = time.time()
        try:
            response = completion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                timeout=20
            )
            responses[model] = {
                "content": response.choices[0].message.content,
                "latency": round(time.time() - start, 2),
                "tokens": response.usage.total_tokens if response.usage else 0,
                "model_used": response.model
            }
        except Exception as e:
            responses[model] = {
                "error": str(e),
                "latency": round(time.time() - start, 2)
            }
    
    return {
        'statusCode': 200,
        'body': json.dumps(responses)
    }