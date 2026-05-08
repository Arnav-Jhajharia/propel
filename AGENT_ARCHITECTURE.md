# Agent Architecture Diagram

This document provides a visual representation of the Lead Agent and Agent (Assistant) architecture using Mermaid diagrams.

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WA[WhatsApp Webhook]
        UI[Dashboard UI]
        API_CLIENT[API Clients]
    end

    subgraph "API Layer"
        LEAD_API["/api/lead-agent<br/>(Lead Conversations)"]
        AGENT_API["/api/agent<br/>(Agent Assistant)"]
        SETUP_API["/api/agent/setup<br/>(Onboarding)"]
        WA_WEBHOOK["/api/whatsapp/webhook<br/>(WhatsApp Integration)"]
    end

    subgraph "Agent Layer - LangGraph"
        LEAD_GRAPH[Lead Graph<br/>leadGraph.ts]
        AGENT_GRAPH[Agent Graph<br/>graph.ts]
        SETUP_GRAPH[Setup Graph<br/>setupGraph.ts]
    end

    subgraph "LLM Layer"
        LLM_FUNCTIONS[LLM Functions<br/>llm.ts]
        PLAN_LEAD[planLeadStep]
        LEAD_REPLY[leadReply]
        PLAN_AGENT[planAgentStep]
        SMALL_TALK[smallTalkReply]
        PLAN_SETUP[planSetupStep]
    end

    subgraph "Tools Layer"
        PROP_TOOL[addPropertyFromUrl]
        APPT_TOOL[createAppointment]
        LIST_TOOL[listRecentProperties]
        PROSPECT_TOOL[listTopProspects]
        SCHEDULE_TOOL[listTodaysAppointments]
        SETUP_TOOLS[Setup Tools]
    end

    subgraph "State Management"
        STATE_PERSIST[Lead State Persistence<br/>lead-state-persistence.ts]
        CONV_DB[(Conversation States DB)]
    end

    subgraph "Data Layer"
        DB[(Database)]
        PROPERTIES[Properties Table]
        APPOINTMENTS[Appointments Table]
        MESSAGES[Messages Table]
        CONVERSATIONS[Conversations Table]
    end

    subgraph "Config Layer"
        BOT_CONFIG[Bot Configuration<br/>botConfigLoader.ts]
        AUTOMATION_CONFIG[Automation Rules]
    end

    %% Client to API connections
    WA --> WA_WEBHOOK
    UI --> LEAD_API
    UI --> AGENT_API
    UI --> SETUP_API
    API_CLIENT --> LEAD_API
    API_CLIENT --> AGENT_API

    %% API to Agent connections
    LEAD_API --> LEAD_GRAPH
    AGENT_API --> AGENT_GRAPH
    SETUP_API --> SETUP_GRAPH
    WA_WEBHOOK --> LEAD_GRAPH

    %% Agent to LLM connections
    LEAD_GRAPH --> PLAN_LEAD
    LEAD_GRAPH --> LEAD_REPLY
    AGENT_GRAPH --> PLAN_AGENT
    AGENT_GRAPH --> SMALL_TALK
    SETUP_GRAPH --> PLAN_SETUP

    %% Agent to Tools connections
    LEAD_GRAPH --> PROP_TOOL
    LEAD_GRAPH --> APPT_TOOL
    AGENT_GRAPH --> PROP_TOOL
    AGENT_GRAPH --> LIST_TOOL
    AGENT_GRAPH --> PROSPECT_TOOL
    AGENT_GRAPH --> SCHEDULE_TOOL
    SETUP_GRAPH --> SETUP_TOOLS

    %% State management
    LEAD_GRAPH --> STATE_PERSIST
    STATE_PERSIST --> CONV_DB
    LEAD_API --> STATE_PERSIST
    WA_WEBHOOK --> STATE_PERSIST

    %% Tools to Data connections
    PROP_TOOL --> PROPERTIES
    APPT_TOOL --> APPOINTMENTS
    LIST_TOOL --> PROPERTIES
    PROSPECT_TOOL --> DB
    SCHEDULE_TOOL --> APPOINTMENTS
    STATE_PERSIST --> CONV_DB

    %% Config connections
    LEAD_GRAPH --> BOT_CONFIG
    BOT_CONFIG --> AUTOMATION_CONFIG

    %% Data layer connections
    PROPERTIES --> DB
    APPOINTMENTS --> DB
    MESSAGES --> DB
    CONVERSATIONS --> DB
    CONV_DB --> DB

    style LEAD_GRAPH fill:#e1f5ff
    style AGENT_GRAPH fill:#fff4e1
    style SETUP_GRAPH fill:#e8f5e9
    style STATE_PERSIST fill:#f3e5f5
    style BOT_CONFIG fill:#fce4ec
```

## Lead Agent Flow (Detailed)

```mermaid
graph TD
    START([User Message]) --> LOAD_STATE[Load Persisted State]
    LOAD_STATE --> INIT_STATE[Initialize State<br/>with userId, message, history,<br/>automationConfig]
    
    INIT_STATE --> PLANNER[Planner Node<br/>planLeadStep]
    
    PLANNER --> CHECK_SCREENING{Screening<br/>Complete?}
    
    CHECK_SCREENING -->|No| ROUTER[Router Node]
    CHECK_SCREENING -->|Yes| TOOL_ROUTE{Tool<br/>Needed?}
    
    ROUTER --> CHECK_PROPERTY{Has<br/>Property?}
    CHECK_PROPERTY -->|No| DETECT_PROP[detect_property<br/>Extract URL & Add]
    CHECK_PROPERTY -->|Yes| CHECK_SCREENING_AUTO{Screening<br/>Automated?}
    
    CHECK_SCREENING_AUTO -->|Yes| PROMPT_SCREENING[prompt_screening<br/>Ask Questions]
    CHECK_SCREENING_AUTO -->|No| FALLBACK[fallback<br/>Handoff to Human]
    
    PROMPT_SCREENING --> CAPTURE_ANSWERS[capture_screening_answers<br/>Extract Answers]
    CAPTURE_ANSWERS --> ALL_ANSWERED{All Questions<br/>Answered?}
    
    ALL_ANSWERED -->|No| ASK_REMAINING[Ask Remaining<br/>Questions]
    ASK_REMAINING --> END_WAIT([Wait for Response])
    
    ALL_ANSWERED -->|Yes| SCREENING_COMPLETE[Mark Screening Complete]
    
    SCREENING_COMPLETE --> PROPERTY_QA{Property<br/>Question?}
    PROPERTY_QA -->|Yes| ANSWER_PROP[answer_property_question<br/>Query DB & Reply]
    PROPERTY_QA -->|No| VIEWING_INTENT{Viewing<br/>Intent?}
    
    VIEWING_INTENT -->|Propose| PROPOSE_VIEWING[propose_viewing<br/>Offer Time Slots]
    VIEWING_INTENT -->|Book| BOOK_VIEWING[book_viewing<br/>Create Appointment]
    
    TOOL_ROUTE -->|add_property| TOOL_ADD_PROP[tool_add_property_from_url]
    TOOL_ROUTE -->|get_property| TOOL_GET_PROP[tool_get_property_details]
    TOOL_ROUTE -->|propose| TOOL_PROPOSE[tool_propose_viewing]
    TOOL_ROUTE -->|book| TOOL_BOOK[tool_book_viewing]
    TOOL_ROUTE -->|respond| RESPOND[respond Node<br/>Generate Reply]
    
    DETECT_PROP --> RESPOND
    ANSWER_PROP --> RESPOND
    PROPOSE_VIEWING --> RESPOND
    BOOK_VIEWING --> RESPOND
    TOOL_ADD_PROP --> RESPOND
    TOOL_GET_PROP --> RESPOND
    TOOL_PROPOSE --> RESPOND
    TOOL_BOOK --> RESPOND
    FALLBACK --> RESPOND
    
    RESPOND --> SAVE_STATE[Save State to DB<br/>propertyId, screeningAnswers,<br/>screeningComplete, offeredSlots]
    SAVE_STATE --> RETURN_REPLY([Return Reply])
    
    END_WAIT --> START
    
    style PLANNER fill:#e1f5ff
    style ROUTER fill:#fff4e1
    style PROMPT_SCREENING fill:#e8f5e9
    style CAPTURE_ANSWERS fill:#e8f5e9
    style SAVE_STATE fill:#f3e5f5
```

## Agent (Assistant) Flow (Detailed)

```mermaid
graph TD
    START([Agent Message]) --> PLANNER[Planner Node<br/>planAgentStep]
    
    PLANNER --> DECIDE{Action<br/>Type?}
    
    DECIDE -->|respond| RESPOND[respond Node<br/>smallTalkReply]
    DECIDE -->|tool| TOOL_SELECT{Which<br/>Tool?}
    
    TOOL_SELECT -->|add_property| ADD_PROP[tool_add_property_from_url<br/>Import PropertyGuru/99.co]
    TOOL_SELECT -->|list_properties| LIST_PROP[tool_list_properties<br/>Show Recent Properties]
    TOOL_SELECT -->|top_prospects| TOP_PROSP[tool_top_prospects<br/>List Top Leads]
    TOOL_SELECT -->|draft_whatsapp| DRAFT[tool_draft_whatsapp<br/>Generate WhatsApp Message]
    TOOL_SELECT -->|list_schedule| SCHEDULE[tool_list_todays_schedule<br/>Show Calendar Events]
    TOOL_SELECT -->|build_link| BUILD_LINK[tool_build_schedule_link<br/>Generate Booking Link]
    TOOL_SELECT -->|create_appt| CREATE_APPT[tool_create_appointment<br/>Add to Calendar]
    
    ADD_PROP --> DB_OP1[(Save to Properties)]
    LIST_PROP --> DB_READ1[(Query Properties)]
    TOP_PROSP --> DB_READ2[(Query Prospects)]
    SCHEDULE --> DB_READ3[(Query Appointments)]
    CREATE_APPT --> DB_OP2[(Create Appointment)]
    
    DB_OP1 --> RESPOND
    DB_READ1 --> RESPOND
    DB_READ2 --> RESPOND
    DRAFT --> RESPOND
    DB_READ3 --> RESPOND
    BUILD_LINK --> RESPOND
    DB_OP2 --> RESPOND
    
    RESPOND --> RETURN([Return Reply + Suggestions])
    
    style PLANNER fill:#fff4e1
    style RESPOND fill:#e1f5ff
    style ADD_PROP fill:#e8f5e9
    style LIST_PROP fill:#e8f5e9
    style TOP_PROSP fill:#e8f5e9
```

## State Persistence Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as Lead Agent API
    participant State as State Persistence
    participant DB as Database
    participant Graph as Lead Graph

    Client->>API: POST /api/lead-agent<br/>{message, history, clientPhone}
    API->>State: loadLeadState(userId, clientPhone)
    State->>DB: SELECT from conversationStates
    DB-->>State: Persisted state (if exists)
    State-->>API: PersistedLeadState | null
    
    API->>Graph: runLeadAgent(input, persistedState)
    Graph->>Graph: Process through nodes<br/>(planner, router, screening, etc.)
    Graph-->>API: Result + Updated State
    
    API->>State: saveLeadState(userId, clientPhone, state)
    State->>DB: UPSERT conversationStates
    DB-->>State: Success
    State-->>API: Saved
    
    API-->>Client: {ok, reply, state}
    
    Note over Client,Graph: State includes:<br/>- propertyId<br/>- screeningFields<br/>- screeningAnswers<br/>- screeningComplete<br/>- offeredSlots
```

## Automation Configuration Flow

```mermaid
graph LR
    subgraph "Configuration Sources"
        USER_CONFIG[User Bot Config]
        CLIENT_CONFIG[Client-Specific Config]
        PROPERTY_CONFIG[Property-Specific Config]
    end
    
    subgraph "Config Loader"
        LOADER[loadAutomationConfig<br/>botConfigLoader.ts]
        PARSER[botConfigParser.ts<br/>isPhaseAutomated<br/>shouldProceedWithPhase]
    end
    
    subgraph "Lead Graph"
        ROUTER[Router Node]
        PHASES[Phase Checks:<br/>- property_detection<br/>- screening<br/>- property_qa<br/>- viewing_proposal<br/>- viewing_booking]
    end
    
    USER_CONFIG --> LOADER
    CLIENT_CONFIG --> LOADER
    PROPERTY_CONFIG --> LOADER
    
    LOADER --> PARSER
    PARSER --> ROUTER
    ROUTER --> PHASES
    
    PHASES -->|Automated| AUTO_NODE[Automated Node]
    PHASES -->|Requires Approval| FALLBACK[Fallback Node]
    
    style LOADER fill:#fce4ec
    style PARSER fill:#fce4ec
    style ROUTER fill:#fff4e1
```

## Key Components

### Lead Agent (leadGraph.ts)
- **Purpose**: Handles conversations with prospects/clients
- **Key Features**:
  - Property detection from URLs
  - Screening questionnaire flow
  - Property Q&A
  - Viewing proposal and booking
  - State persistence across conversations
  - Automation rule enforcement

### Agent (graph.ts)
- **Purpose**: Assistant for property agents
- **Key Features**:
  - Property management (add, list)
  - Prospect management
  - Schedule management
  - WhatsApp message drafting
  - Calendar integration

### Setup Agent (setupGraph.ts)
- **Purpose**: Onboarding and configuration
- **Key Features**:
  - Setup checklist
  - Questionnaire configuration
  - Calendar integration setup
  - Calendly URL setup

### State Persistence
- **Purpose**: Maintain conversation context across sessions
- **Stored Data**:
  - Property ID and details
  - Screening fields and answers
  - Screening completion status
  - Offered viewing slots
- **Key Functions**:
  - `saveLeadState()`: Persist state to database
  - `loadLeadState()`: Retrieve state for conversation
  - `extractPersistedState()`: Extract state from graph result

### Automation Configuration
- **Purpose**: Control which phases are automated vs require approval
- **Phases**:
  - `property_detection`: Auto-detect and add properties
  - `screening`: Automated screening questions
  - `property_qa`: Answer property questions
  - `viewing_proposal`: Propose viewing slots
  - `viewing_booking`: Book appointments
- **Configuration Levels**:
  - User-level defaults
  - Client-specific overrides
  - Property-specific overrides

