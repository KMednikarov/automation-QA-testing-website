# Atlas API learner project

Open **Learning path** in Atlas and follow the eight API-only Postman/Karate sessions. This project supplies two runnable smoke scenarios; extend it with the course tasks. It is not a completed solution or coverage of all ten API defects.

Start Atlas from the repository root with `bash scripts/start.sh`. With Java 21+ and Maven 3.9+ available, run:

```bash
mvn --batch-mode -f training/karate/pom.xml test
mvn --batch-mode -f training/karate/pom.xml test -DbaseUrl=http://127.0.0.1:8000
mvn --batch-mode -f training/karate/pom.xml test '-Dkarate.options=--tags @smoke'
```

Open `target/karate-reports/karate-summary.html` relative to this project. A failing assertion must return a failed Maven result. The runner rejects empty discovery and runs one thread because the training database and flags are shared. Helpers/data mentioned in later lessons are tasks for you to add.

Use clean mode for regressions. The instructor enables one assigned API defect for detection practice; keep the correct assertion, capture the failure, disable the flag, and rerun. Reset signs everyone out and deletes custom data: coordinate it outside active runs. Prefer created IDs and cleanup over modifying seeds. UI defects are not part of the learner course.
