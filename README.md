<a name="top"></a>
![----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

![NSOC'26](https://img.shields.io/badge/NSOC-2026-orange?style=for-the-badge)

**This project is officially registered under nexus spring of code 2026.**

![----------------------------------------------------](https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png)

# SkillSphere AI

SkillSphere AI is an AI-powered full-stack platform that connects **learning**, **skill evaluation**, and **career readiness** in one ecosystem.

It helps:

- **Students** learn, practice, and become job-ready
- **Tutors** run live, interactive classes
- **Recruiters** discover skilled and better-matched candidates

The platform combines live classroom experiences with AI/ML-driven career tools such as resume analysis, job matching, interview practice, and performance tracking.

---

## Project Vision

SkillSphere AI aims to simplify the path from learning to hiring by giving users practical, actionable insights at every stage:

- Learn skills in real-time
- Measure progress through dashboards
- Improve career assets (resume and interview performance)
- Connect capabilities to hiring needs

---

## Core Features

1. **Live Interactive Classrooms** Real-time learning sessions with video, chat, and collaboration.

2. **AI Resume Analyzer** Resume scoring with improvement suggestions. (Route: `/resume-analyzer`)
   - Drag & Drop / clipboard paste upload
   - ATS score with detailed analysis dashboard
   - Missing keyword identification
   - **Industry Benchmarking Mode** — Analyzes your resume against market standards even without a specific Job Description (BM badge).
   - Live PDF document preview

3. **Resume vs Job Description Matcher** ML-assisted comparison between candidate profile and role requirements.
   - **Semantic Resume vs Job Description Matching** — Embedding-based semantic similarity scoring using Hugging Face Inference API (all-MiniLM-L6-v2, free tier)
   - Complements keyword overlap with contextual alignment detection
   - Cosine similarity comparison for conceptually related phrases (e.g., "workflow orchestration" vs "pipeline automation")

4. **AI Mock Interview System** Adaptive interview practice with real-time AI evaluation. (Route: `/mock-interview`)
   - Topic selection (React, Node.js, DSA) with difficulty levels
   - 5-question sessions with randomized, non-repeating questions
   - AI-powered scoring: technical accuracy, communication quality, and concept relevance
   - Live score feedback after each answer
   - Results dashboard with overall score ring, per-question breakdown, and weak concepts
   - Interview history with paginated session tracking
   - Python AI microservice for NLP evaluation (spaCy + sentence-transformers)
   - Fail-soft mode: falls back to mock scores when AI service is unavailable

5. **Interactive Learning Roadmaps** Personalized
