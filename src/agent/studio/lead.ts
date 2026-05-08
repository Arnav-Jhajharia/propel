// Lead management chatbot - Following LangGraph MessagesAnnotation pattern
import { StateGraph, END, START, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { runLeadAgent, LeadInput } from "../leadGraph";

// Extend MessagesAnnotation with lead-specific state
// This follows the Python article pattern: MessagesAnnotation + custom fields
const LeadChatState = Annotation.Root({
  ...MessagesAnnotation.spec,
  // Lead-specific state fields
  userId: Annotation<string>({
    reducer: (left, right) => right ?? left,
    default: () => "studio-test-user",
  }),
  propertyId: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  propertyTitle: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  propertyUrl: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  screeningFields: Annotation<Array<{ id: string; label: string; prompt?: string }> | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  screeningAnswers: Annotation<Record<string, string> | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  screeningComplete: Annotation<boolean | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  offeredSlots: Annotation<string[] | undefined>({
    reducer: (left, right) => right ?? left,
  }),
  clientId: Annotation<string | undefined>({
    reducer: (left, right) => right ?? left,
  }),
});

// Main LLM node - processes user messages through leadAgent
async function llmCall(state: typeof LeadChatState.State) {
  const messages = state.messages;
  
  // Get the last human message
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !(lastMessage instanceof HumanMessage)) {
    return {
      messages: [new AIMessage("Please send a message to start the conversation.")],
    };
  }

  const userMessage = lastMessage.content.toString();

  // Convert LangGraph messages to our history format
  const history = messages.slice(0, -1).map((msg: BaseMessage) => ({
    role: msg instanceof HumanMessage ? "user" as const : "assistant" as const,
    text: msg.content.toString(),
  }));

  console.log("[llmCall] Processing message:", userMessage);
  console.log("[llmCall] Current state:", {
    propertyId: state.propertyId,
    screeningComplete: state.screeningComplete,
    historyLength: history.length,
  });

  // Build input for leadAgent
  const input: LeadInput = {
    userId: state.userId,
    message: userMessage,
    history,
  };

  // Call the leadAgent with persisted state
  const result = await runLeadAgent(input, {
    propertyId: state.propertyId,
    propertyTitle: state.propertyTitle,
    propertyUrl: state.propertyUrl,
    screeningFields: state.screeningFields,
    screeningAnswers: state.screeningAnswers,
    screeningComplete: state.screeningComplete,
    offeredSlots: state.offeredSlots,
    clientId: state.clientId,
  });

  console.log("[llmCall] Result:", {
    reply: result.reply?.substring(0, 100) + "...",
    propertyId: result.state?.propertyId,
    screeningComplete: result.state?.screeningComplete,
  });

  // Return updated state - LangGraph automatically merges this with existing state
  // Following the Python pattern: return dict with updated fields
  return {
    messages: [new AIMessage(result.reply)],
    propertyId: result.state?.propertyId,
    propertyTitle: result.state?.propertyTitle,
    propertyUrl: result.state?.propertyUrl,
    screeningFields: result.state?.screeningFields,
    screeningAnswers: result.state?.screeningAnswers,
    screeningComplete: result.state?.screeningComplete,
    offeredSlots: result.state?.offeredSlots,
    clientId: result.state?.clientId,
  };
}

// Build the graph - following Python article pattern
console.log("[lead] Building graph...");

const graphBuilder = new StateGraph(LeadChatState)
  .addNode("llm_call", llmCall)
  .addEdge(START, "llm_call")
  .addEdge("llm_call", END);

// Compile and export
export const graph = graphBuilder.compile();

console.log("[lead] ✅ Graph compiled successfully with MessagesAnnotation");
