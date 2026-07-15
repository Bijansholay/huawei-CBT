#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${AWS_REGION:-}" ]]; then
  echo "AWS_REGION is required" >&2
  exit 1
fi

if [[ -z "${LIGHTSAIL_SERVICE_NAME:-}" ]]; then
  echo "LIGHTSAIL_SERVICE_NAME is required" >&2
  exit 1
fi

if [[ -z "${JWT_SECRET:-}" || -z "${ADMIN_EMAIL:-}" || -z "${ADMIN_PASSWORD:-}" || -z "${CORS_ORIGIN:-}" || -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_KEY:-}" || -z "${OPENAI_API_KEY:-}" ]]; then
  echo "One or more required application env vars are missing" >&2
  exit 1
fi

LIGHTSAIL_CONTAINER_NAME="${LIGHTSAIL_CONTAINER_NAME:-app}"
LIGHTSAIL_CONTAINER_PORT="${LIGHTSAIL_CONTAINER_PORT:-3000}"
LIGHTSAIL_IMAGE_LABEL="${LIGHTSAIL_IMAGE_LABEL:-app}"
LIGHTSAIL_HEALTH_CHECK_PATH="${LIGHTSAIL_HEALTH_CHECK_PATH:-/api/health}"
LIGHTSAIL_HEALTHY_THRESHOLD="${LIGHTSAIL_HEALTHY_THRESHOLD:-2}"
LIGHTSAIL_UNHEALTHY_THRESHOLD="${LIGHTSAIL_UNHEALTHY_THRESHOLD:-3}"
LIGHTSAIL_HEALTH_CHECK_TIMEOUT="${LIGHTSAIL_HEALTH_CHECK_TIMEOUT:-5}"
LIGHTSAIL_HEALTH_CHECK_INTERVAL="${LIGHTSAIL_HEALTH_CHECK_INTERVAL:-10}"
LIGHTSAIL_HEALTH_SUCCESS_CODES="${LIGHTSAIL_HEALTH_SUCCESS_CODES:-200-399}"
OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o-mini}"
LOCAL_IMAGE="${LIGHTSAIL_SERVICE_NAME}:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

echo "Building backend image: ${LOCAL_IMAGE}"
docker build -t "${LOCAL_IMAGE}" Backend

echo "Pushing image to Lightsail service registry"
aws lightsail push-container-image \
  --service-name "${LIGHTSAIL_SERVICE_NAME}" \
  --image "${LOCAL_IMAGE}" \
  --label "${LIGHTSAIL_IMAGE_LABEL}" \
  --region "${AWS_REGION}"

containers_json="$(node <<'NODE'
const env = process.env;
const serviceName = env.LIGHTSAIL_SERVICE_NAME;
const imageLabel = env.LIGHTSAIL_IMAGE_LABEL || 'app';
const containerName = env.LIGHTSAIL_CONTAINER_NAME || 'app';
const containerPort = String(env.LIGHTSAIL_CONTAINER_PORT || 3000);

const environment = {
  NODE_ENV: 'production',
  PORT: containerPort,
  STORAGE_DRIVER: 'supabase',
  TRUST_PROXY: 'true',
  JWT_SECRET: env.JWT_SECRET,
  ADMIN_EMAIL: env.ADMIN_EMAIL,
  ADMIN_PASSWORD: env.ADMIN_PASSWORD,
  CORS_ORIGIN: env.CORS_ORIGIN,
  SUPABASE_URL: env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  OPENAI_MODEL: env.OPENAI_MODEL || 'gpt-4o-mini'
};

const containers = {};
containers[containerName] = {
  image: `:${serviceName}.${imageLabel}.latest`,
  environment,
  ports: {
    [containerPort]: 'HTTP'
  }
};

process.stdout.write(JSON.stringify(containers));
NODE
)"

public_endpoint_json="$(node <<'NODE'
const env = process.env;
const publicEndpoint = {
  containerName: env.LIGHTSAIL_CONTAINER_NAME || 'app',
  containerPort: Number(env.LIGHTSAIL_CONTAINER_PORT || 3000),
  healthCheck: {
    path: env.LIGHTSAIL_HEALTH_CHECK_PATH || '/api/health',
    healthyThreshold: Number(env.LIGHTSAIL_HEALTHY_THRESHOLD || 2),
    unhealthyThreshold: Number(env.LIGHTSAIL_UNHEALTHY_THRESHOLD || 3),
    timeoutSeconds: Number(env.LIGHTSAIL_HEALTH_CHECK_TIMEOUT || 5),
    intervalSeconds: Number(env.LIGHTSAIL_HEALTH_CHECK_INTERVAL || 10),
    successCodes: env.LIGHTSAIL_HEALTH_SUCCESS_CODES || '200-399'
  }
};

process.stdout.write(JSON.stringify(publicEndpoint));
NODE
)"

echo "Creating Lightsail deployment"
aws lightsail create-container-service-deployment \
  --service-name "${LIGHTSAIL_SERVICE_NAME}" \
  --containers "${containers_json}" \
  --public-endpoint "${public_endpoint_json}" \
  --region "${AWS_REGION}"

echo "Lightsail deployment submitted successfully"
