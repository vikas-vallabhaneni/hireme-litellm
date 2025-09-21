# Dockerfile - Fixed version
FROM public.ecr.aws/lambda/python:3.11

# Install build dependencies
RUN yum install -y gcc-c++ gcc python3-devel

# Copy requirements file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy function code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD ["lambda_function.lambda_handler"]