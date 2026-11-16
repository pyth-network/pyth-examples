# Infrastructure

Docker Compose stack (Hydra peers + automatic seed tx).

```bash
cd infra

# for running the infra
docker compose up -d

# for reseting infra state
docker compose down -v && rm -rf persistence/

# for reset + restart
docker compose down -v && rm -rf persistence/ && docker compose up -d
```
