# VCMS Database (PostgreSQL)

## Run with Docker
    docker compose up -d
    docker exec -it vcms-db psql -U vcms -d vcms
Reset everything: `docker compose down -v && docker compose up -d`

## Run without Docker (Postgres installed)
    createdb -U postgres vcms
    psql -U postgres -d vcms -f db/01_schema.sql
    psql -U postgres -d vcms -f db/02_seed.sql

## Demo queries
    SELECT * FROM available_slots(4, CURRENT_DATE + 8);          -- free slots (APT-3)
    SELECT merge_clients(1, 6);                                   -- merge duplicates (REG-4)
    UPDATE appointments SET status='Completed' WHERE appointment_id=4;   -- blocked: illegal transition
    SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT 5;       -- audit trail (REG-7)

## Rules enforced in the DB
| SRS | Enforced by |
|---|---|
| APT-4 no double booking | EXCLUDE constraint `no_double_booking` |
| APT-3 / BR-3 working hours | trigger `trg_appt_hours` |
| APT-6 cancel needs reason | CHECK on appointments |
| SRS B.3 status flow | trigger `trg_appt_status` |
| REG-4 merge | function `merge_clients()` |
| REG-6 no hard delete | triggers `trg_*_nodelete` |
| REG-7 audit | triggers `trg_audit_*` (backend sets `SET LOCAL app.user_id`) |

Logins (all `Password@123`): admin@vcms.test, ravi@vcms.test, rao@vcms.test; pet owner: meera@mail.com.
Duplicate demo: clients 1 and 6 share phone 9820011111.
