# 🚀 AI-Native Mini CRM & Communication Engine

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring AI](https://img.shields.io/badge/Spring%20AI-Gemini%202.5-blue.svg)](https://spring.io/projects/spring-ai)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-AMQP%200--9--1-coral.svg)](https://www.rabbitmq.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)

An enterprise-ready, AI-native Customer Relationship Management (CRM) platform and high-throughput communication engine. Built to eliminate the friction of traditional query builders by translating natural language marketing intent into deterministic database operations, backed by an event-driven asynchronous webhook ingestion pipeline.

---

## 🏗️ High-Level System Architecture

The platform is designed around a decoupled, microservices-inspired architecture that separates user interaction, AI semantic reasoning, transactional persistence, external channel simulation, and high-volume event ingestion.

```mermaid
flowchart TD
    subgraph Client ["🖥️ Client Tier"]
        UI["React 18 + Vite Dashboard\n(Tailwind CSS v4)"]
    end

    subgraph Backend ["⚙️ Core CRM Backend (Spring Boot 3)"]
        API["REST Controllers\n(/api/campaigns, /api/customers)"]
        AI_Orch["Spring AI Orchestration Engine"]
        Tools["@Tool Segmentation Registry\n(Strict Java Parameterized Methods)"]
        ExecService["Campaign Execution Service"]
        WebhookCtrl["Webhook Ingestion Controller\n(HMAC-SHA256 Auth Guard)"]
        Consumer["@RabbitListener Consumer Worker\n(Decoupled DB Writer)"]
    end

    subgraph AI ["🧠 Intelligence Tier"]
        Gemini["Google Gemini 2.5 Flash\n(Structured Function Calling)"]
    end

    subgraph Storage ["🗄️ Persistence & Message Broker"]
        Postgres[("PostgreSQL\n(ACID Relational Storage)")]
        RabbitMQ{{"RabbitMQ Message Broker\n(Direct Exchange + DLQ)"}}
    end

    subgraph Provider ["📡 External Channel Simulator"]
        NodeSvc["Node.js Channel Service\n(WhatsApp / SMS / Email Simulator)"]
    end

    %% AI Query Flow
    UI -->|"1. Natural Language Prompt"| API
    API -->|"2. Intent + JSON Tool Schemas"| AI_Orch
    AI_Orch <-->|"3. Function Calling Protocol"| Gemini
    AI_Orch -->|"4. Invokes Pre-approved Tool"| Tools
    Tools -->|"5. Parameterized JPA Query"| Postgres

    %% Dispatch Flow
    UI -->|"6. Launch Campaign"| API
    API -->|"7. Batch Outbound HTTP POST"| ExecService
    ExecService -->|"8. Dispatches Messages"| NodeSvc

    %% Webhook Feedback Loop
    NodeSvc -->|"9. Async Delivery Receipt + HMAC"| WebhookCtrl
    WebhookCtrl -->|"10. Push Event (O(1) Fast Ack)"| RabbitMQ
    RabbitMQ -->|"11. Push Event to Worker"| Consumer
    Consumer -->|"12. Safe DB Status & Attribution"| Postgres
```

---

## 🔄 End-to-End Request Flow

The system operates across two critical workflows: **AI-Powered Audience Segmentation** and **Event-Driven Delivery & Ingestion**.

```mermaid
sequenceDiagram
    autonumber
    actor Marketer
    participant UI as React 18 Dashboard
    participant API as Spring Boot API
    participant AI as Spring AI / Gemini 2.5 Flash
    participant DB as PostgreSQL
    participant Node as Node.js Channel Service
    participant RMQ as RabbitMQ Broker
    participant Worker as @RabbitListener Consumer

    Note over Marketer, DB: Phase 1: Natural Language Audience Segmentation & Copy Gen
    Marketer->>UI: Enters "Find high spenders inactive for 3 months"
    UI->>API: POST /api/campaigns/segment (Prompt)
    API->>AI: Prompt + Generated Tool Schemas (JSON)
    AI-->>API: Tool Request: findInactiveHighSpenders(months=3, minSpend=500)
    API->>DB: Parameterized JPA Query (No raw SQL)
    DB-->>API: Customer Cohort Result Set
    API->>AI: Generate 3 Personalized Copy Variants
    AI-->>API: Variant A, B, C generated
    API-->>UI: 200 OK (Cohort Size, Customer Preview, Copy Variants)

    Note over Marketer, Worker: Phase 2: Campaign Dispatch & Asynchronous Webhook Feedback Loop
    Marketer->>UI: Clicks "Launch Campaign"
    UI->>API: POST /api/campaigns/{id}/send
    API->>DB: Create Communications Ledger (Status: PENDING)
    API->>Node: HTTP POST /send (Simulate WhatsApp / Email)
    Node-->>API: 200 OK (Accepted by Channel)

    Note over Node, Worker: Phase 3: Webhook Ingestion & "Shock Absorber" Pattern
    Node->>Node: Simulates Latency (2-5s) & Channel Events (DELIVERED / READ)
    Node->>API: POST /api/webhook/receipt (Payload + HMAC-SHA256 Header)
    API->>API: Verify HMAC-SHA256 in Constant Time
    API->>RMQ: Publish Event to Direct Exchange
    API-->>Node: 202 Accepted (Instant ACK prevents upstream timeouts)
    RMQ->>Worker: Push Event to Consumer
    Worker->>DB: Update Status & Compute 7-day Last-Touch Attribution
```

---

## 💡 Core Engineering Pillars

### 1. Deterministic AI via Spring AI Function Calling (`@Tool`)
* **The Problem:** Naive Text-to-SQL allows LLMs to write raw SQL directly against the database, opening severe risks of SQL injection, schema corruption, and hallucinations.
* **The Solution:** The LLM is confined strictly to an application-level **semantic router**. Spring AI dynamically converts Java methods annotated with `@Tool` into JSON schemas for Gemini. The LLM selects the correct tool and parameters; our backend executes strictly parameterized Spring Data JPA queries. **Zero raw SQL is ever executed by the LLM.**

### 2. The "Shock Absorber" Webhook Ingestion (RabbitMQ)
* **The Problem:** Disagreeing network speeds and bulk campaigns (e.g., 50,000 messages) cause thousands of delivery receipts to return simultaneously, leading to database connection pool starvation and crashes.
* **The Solution:** The webhook intake endpoint (`POST /api/webhook/receipt`) performs only lightweight validation and immediately pushes the payload to **RabbitMQ**, returning `202 Accepted` in sub-10ms. A background `@RabbitListener` consumes events at a controlled rate, with a **Dead-Letter Queue (DLQ)** to isolate poisoned messages without blocking the pipeline.

### 3. Cryptographic Webhook Security (HMAC-SHA256)
* The webhook endpoint is secured using **HMAC-SHA256 signatures** (`X-Hub-Signature-256`).
* The payload is hashed with a shared symmetric secret on the provider side. The Spring Boot backend recalculates the hash and compares it using constant-time byte equality, guaranteeing **authenticity** (verifying the sender) and **data integrity** (detecting tampering in transit) without exposing secrets over the wire.

### 4. Financial-Grade Attribution & Ingestion
* **`BigDecimal` Precision:** Order values and monetary calculations avoid IEEE 754 binary floating-point drift.
* **7-Day Last-Touch Attribution:** Orders occurring within 7 days of campaign delivery are deterministically attributed to the specific communication and campaign.
* **Transactional Bulk Ingestion:** Supports single and CSV file uploads with strict Jakarta validation wrapped in `@Transactional` rollback guarantees.

---

## 🛠️ Tech Stack Breakdown

| Layer | Technologies | Key Responsibility |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v4, Lucide Icons | Dark-mode SaaS UI, real-time KPI metrics, AI prompt builder |
| **Backend Core** | Java 17, Spring Boot 3.2, Spring Data JPA | REST APIs, business logic, entity management, security |
| **AI Layer** | Spring AI, Google Gemini 2.5 Flash | Natural language translation, tool selection, copy drafting |
| **Messaging** | RabbitMQ (AMQP 0-9-1), Spring AMQP | Asynchronous webhook queuing, load leveling, DLQ |
| **Database** | PostgreSQL | Relational storage (Customers, Orders, Campaigns, Communications) |
| **Simulator** | Node.js, Express, Crypto | Simulates external vendor dispatch, backoff retries, webhook dispatch |

---

## 🚀 Getting Started Locally

### Prerequisites
* Java 17+
* Node.js 18+
* PostgreSQL (Running on port 5432)
* RabbitMQ (Local server or CloudAMQP instance)
* Gemini API Key

### 1. Spring Boot Backend
Navigate to `Xeno Backend` and start the server:
```bash
cd "Xeno Backend"
./mvnw spring-boot:run
```
*(Automatically seeds mock customer and order records on first boot).*

### 2. Node.js Channel Simulator
Navigate to `Xeno Channel Service` and start the mock provider:
```bash
cd "Xeno Channel Service"
npm install
npm start
```
*(Runs on port 3001, listening for dispatches and returning signed webhooks).*

### 3. React Frontend Dashboard
Navigate to `Frontend Xeno` and start the Vite dev server:
```bash
cd "Frontend Xeno"
npm install
npm run dev
```
*(Open `http://localhost:5173` in your browser).*

---

*Architected with focus on scalability, security, and deterministic AI systems.*
