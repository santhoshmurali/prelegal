---
name: coreweave-inference
description: CoreWeave Inference skill for performing AI model inference on the CoreWeave Infrastructure Provider.
---

# Calling an LLM via CoreWeave Inference
These instructions will guide you on how to write code to call an LLM via CoreWeave Inference.
This method uses LiteLM and OpenRouter.

## Prerequisites
The OpenRouter API key (OPENROUTER_API_KEY) must be set in .env file and loaded in as an environment variable before running the code. 
Set the OpenRouter base URL (OPENROUTER_BASE_URL) in the .env file and load it as an environment variable before running the code.
```
python
base_url="https://openrouter.ai/api/v1"
```

Additionally, ensure that you have installed the necessary dependencies for interacting with the CoreWeave Inference API, such as the LiteLM and OpenRouter client libraries:  
  
The `uv` project must include the LiteLM and pydantic libraries as dependencies, which can be added via uv:  

`uv add litelm pydantic`  

## Code Snippets

Use code like these examples to call an LLM via CoreWeave Inference:

### Imports and constants
```
python
from litelm import completion
MODEL = "openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"only": ["coreweave/fp4"]}}
```


### Code to call via CoreWeave Inference for a text response
```
python
response = completion.create(
    model=MODEL,
    messages=messages,
    reasoning_effort="low",
    extra_body=EXTRA_BODY
)
result = response.choices[0].message.content
```

### Code to call via CoreWeave Inference for a Structured Outputs response
```
python
response = completion.create(
    model=MODEL,
    messages=messages,
    response_format=MyBaseModelSubclass,
    reasoning_effort="low",
    extra_body=EXTRA_BODY
)
result = response.choices[0].message.content
result_as_object = MyBaseModelSubclass.model_validate_json(result)
```