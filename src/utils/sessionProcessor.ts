import { ApiSessionResponse, ProcessedEvent, TimelineEvent } from '@/types/session';
import { AgentNameService } from '@/services/agentNameService';

export function processSessionData(sessionData: ApiSessionResponse): {
  events: ProcessedEvent[];
  timelineEvents: TimelineEvent[];
} {
  const events: ProcessedEvent[] = [];
  
  // Process chat history and agent responses to create events
  const chatHistory = sessionData.chat_history || [];
  const agentResponses = sessionData.agent_responses || [];
  const detections = sessionData.detections || [];
  
  console.log('🔍 Session data violations:', {
    detections: detections.length,
    chatHistory: chatHistory.length,
    agentResponses: agentResponses.length,
    detectionsData: detections
  });
  
  // Create maps of agent responses for quick lookup - use request_id primarily, trace_id as fallback
  const responsesByRequestId = new Map();
  const responsesByTraceId = new Map();
  agentResponses.forEach(response => {
    // Primary lookup by request_id
    if (response.request_id) {
      responsesByRequestId.set(response.request_id, response);
    }
    // Fallback lookup by trace_id
    if (response.trace_id) {
      responsesByTraceId.set(response.trace_id, response);
    }
  });
  
  // Create a map of detections by message_id, message_index, request_id, and trace_id
  const detectionByMessageId = new Map();
  const detectionMap = new Map();
  const detectionByTraceId = new Map();
  const detectionByRequestId = new Map();
  
  detections.forEach(detection => {
    // Map by message_id (primary correlation method)
    if (detection.message_id) {
      const messageDetections = detectionByMessageId.get(detection.message_id) || [];
      messageDetections.push(detection);
      detectionByMessageId.set(detection.message_id, messageDetections);
    }
    
    // Map by request_id
    if (detection.request_id) {
      const requestDetections = detectionByRequestId.get(detection.request_id) || [];
      requestDetections.push(detection);
      detectionByRequestId.set(detection.request_id, requestDetections);
    }
    
    // Map by message index if available
    if (detection.message_index !== undefined) {
      const messageDetections = detectionMap.get(detection.message_index) || [];
      messageDetections.push(detection);
      detectionMap.set(detection.message_index, messageDetections);
    }
    
    // Map by trace_id if available
    if (detection.trace_id) {
      const traceDetections = detectionByTraceId.get(detection.trace_id) || [];
      traceDetections.push(detection);
      detectionByTraceId.set(detection.trace_id, traceDetections);
    }
  });
  
  console.log('🔍 Detection maps:', { 
    detectionByMessageId: detectionByMessageId.size, 
    detectionByRequestId: detectionByRequestId.size,
    detectionMap: detectionMap.size, 
    detectionByTraceId: detectionByTraceId.size 
  });
  
  // Process each request-response cycle
  chatHistory.forEach((message, index) => {
    if (message.role === 'user') {
      // Find detections for this message using multiple correlation methods
      const userDetections = [
        ...(detectionByMessageId.get(message.message_id) || []),
        ...(detectionByRequestId.get(message.request_id) || []),
        ...(detectionMap.get(index) || []),
        ...(detectionByTraceId.get(message.request_id || message.message_id) || [])
      ].filter((detection, index, self) => 
        index === self.findIndex(d => d.id === detection.id || 
          (d.message_id === detection.message_id && d.detection_type === detection.detection_type))
      ); // Remove duplicates
      
      events.push({
        id: message.message_id,
        timestamp: message.timestamp,
        type: 'user_message',
        agent: 'User',
        content: message.content,
        detections: userDetections,
        request_id: message.request_id,
      });
      
      console.log('🔍 User message:', message.message_id, 'detections:', userDetections.length, userDetections);
      
      // Check for corresponding agent response using request_id first, then trace_id fallback
      let agentResponse = responsesByRequestId.get(message.request_id);
      if (!agentResponse && message.message_id) {
        // Fallback: try to match trace_id with message_id
        agentResponse = responsesByTraceId.get(message.message_id);
      }
      if (agentResponse) {
        console.log('🔍 Agent response found:', agentResponse.response_id);
        // Calculate timestamps for proper ordering
        const responseTime = new Date(agentResponse.timestamp).getTime();
        const handoffTime = responseTime - 100; // 100ms before response
        
        // Add handoff event if it occurred
        if (agentResponse.handoff_occurred && agentResponse.handoff_details) {
          events.push({
            id: `${agentResponse.response_id}-handoff`,
            timestamp: new Date(handoffTime).toISOString(),
            type: 'handoff',
            agent: AgentNameService.getCachedAgentName(agentResponse.handoff_details.from_agent) || getCleanAgentName(agentResponse.handoff_details.from_agent),
            content: `Handoff to ${AgentNameService.getCachedAgentName(agentResponse.handoff_details.to_agent) || getCleanAgentName(agentResponse.handoff_details.to_agent)}`,
            details: {
              from_agent: agentResponse.handoff_details.from_agent,
              from_agent_id: agentResponse.handoff_details.from_agent, // Store agent_id for graph building
              to_agent: agentResponse.handoff_details.to_agent,
              to_agent_id: agentResponse.handoff_details.to_agent, // Store agent_id for graph building
              reason: agentResponse.handoff_details.reason,
              handoff_type: agentResponse.handoff_details.handoff_type
            }
          });
        }
        
        // Add tool usage events (ensuring they appear after handoff if both exist)
        agentResponse.tools_used?.forEach((tool, toolIndex) => {
          // If handoff occurred, place tool calls after handoff but before response
          const toolTimestamp = agentResponse.handoff_occurred 
            ? new Date(handoffTime + 50 + (toolIndex * 10)).toISOString() // 50ms after handoff, spaced by 10ms
            : tool.timestamp;
            
          events.push({
            id: `${agentResponse.response_id}-tool-${toolIndex}`,
            timestamp: toolTimestamp,
            type: 'tool_call',
            agent: AgentNameService.getCachedAgentName(agentResponse.agent_id || agentResponse.agent) || getCleanAgentName(agentResponse.agent_id || agentResponse.agent),
            agent_id: agentResponse.agent_id || agentResponse.agent, // Store agent_id for graph building
            content: `Using ${tool.tool_name}`,
            details: {
              tool_name: tool.tool_name,
              parameters: tool.parameters,
              result: tool.result
            }
          });
        });
        
        // Add agent response event - check for detections by response_id and request_id
        const responseDetections = [
          ...(detectionByMessageId.get(agentResponse.response_id) || []),
          ...(detectionByRequestId.get(agentResponse.request_id) || []),
          ...(detectionMap.get(index + 1) || []),
          ...(detectionByTraceId.get(agentResponse.response_id) || [])
        ].filter((detection, index, self) => 
          index === self.findIndex(d => d.id === detection.id || 
            (d.message_id === detection.message_id && d.detection_type === detection.detection_type))
        ); // Remove duplicates
        
        events.push({
          id: agentResponse.response_id,
          timestamp: agentResponse.timestamp,
          type: 'agent_response',
          agent: AgentNameService.getCachedAgentName(agentResponse.agent_id || agentResponse.agent) || getCleanAgentName(agentResponse.agent_id || agentResponse.agent),
          agent_id: agentResponse.agent_id || agentResponse.agent, // Store agent_id for graph building
          content: agentResponse.response,
          duration: agentResponse.duration_seconds,
          detections: responseDetections,
          request_id: agentResponse.request_id,
          details: {
            handoff_occurred: agentResponse.handoff_occurred,
          }
        });
        
        console.log('🔍 Agent response:', agentResponse.response_id, 'detections:', responseDetections.length, responseDetections);
      }
    }
  });
  
  // Insert violation events after each event that has detections
  const eventsWithViolations: ProcessedEvent[] = [];
  events.forEach((event, index) => {
    eventsWithViolations.push(event);
    
    console.log('🔍 Checking event for violations:', event.id, 'detections:', event.detections?.length);
    
    if (event.detections && event.detections.length > 0) {
      console.log('🔍 Adding violation events for:', event.id, event.detections);
      // Create violation events for each detection
      event.detections.forEach((detection, detectionIndex) => {
        const violationTimestamp = new Date(new Date(event.timestamp).getTime() + 1 + detectionIndex).toISOString();
        const violationEvent = {
          id: `${event.id}-violation-${detectionIndex}`,
          timestamp: violationTimestamp,
          type: 'violation' as const,
          agent: 'Security Monitor',
          content: `${detection.detection_type?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} - ${detection.context || 'Security violation detected'}`,
          severity: detection.severity || 'medium' as any,
          details: {
            detection_type: detection.detection_type,
            context: detection.context,
            matches: detection.matches,
            violation_id: detection.id
          }
        };
        console.log('🔍 Created violation event:', violationEvent);
        eventsWithViolations.push(violationEvent);
      });
    }
  });
  
  console.log('🔍 Total events after adding violations:', eventsWithViolations.length);
  
  // Sort all events by timestamp
  eventsWithViolations.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Calculate timeline positions using updated events
  const startTime = eventsWithViolations.length > 0 ? new Date(eventsWithViolations[0].timestamp).getTime() : 0;
  const endTime = eventsWithViolations.length > 0 ? new Date(eventsWithViolations[eventsWithViolations.length - 1].timestamp).getTime() : 0;
  const totalDuration = endTime - startTime;
  
  const timelineEvents: TimelineEvent[] = eventsWithViolations.map((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    const x = totalDuration > 0 ? ((eventTime - startTime) / totalDuration) * 100 : 0;
    
    return {
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      agent: event.agent,
      content: event.content,
      x,
      severity: event.severity,
      hasViolations: event.detections && event.detections.length > 0
    };
  });
  
  return { events: eventsWithViolations, timelineEvents };
}

function getCleanAgentName(agentId: string): string {
  // Convert agent IDs to readable names (fallback for when API names are not available)
  if (agentId.includes('Customer Service Agent') || agentId.includes('customer_service')) return 'Customer Service Agent';
  if (agentId.includes('File System Agent') || agentId.includes('file_system')) return 'File System Agent';
  if (agentId.includes('Web Search Agent') || agentId.includes('web_search')) return 'Web Search Agent';
  if (agentId.includes('summarizer')) return 'Summarizer Agent';
  
  // Generic cleanup for unknown agent types
  return agentId
    .replace(/^agent_/, '') // Remove agent_ prefix
    .replace(/_agent_[a-f0-9]+$/, '') // Remove _agent_<hash> suffix
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Title case
}

export function getAgentColorClass(agent: string): string {
  const colorMap: Record<string, string> = {
    'User': 'user',
    'Customer Service Agent': 'customer-service',
    'CustomerServiceAgent': 'customer-service',
    'File System Agent': 'file-system',
    'FileSystemAgent': 'file-system',
    'Web Search Agent': 'web-search',
    'WebSearchAgent': 'web-search',
    'WebPortalAgent': 'web-search',
    'Summarizer Agent': 'summarizer',
    'SummarizerAgent': 'summarizer',
    'JuryAgent': 'customer-service',
    'JudgeAgent': 'customer-service',
    // Tool calls (these should be handled separately now)
    'Tool Call': 'tool-call',
    'Normal Search': 'tool-call',
    'Judge Search': 'tool-call',
    'write_file': 'tool-call',
    'read_file': 'tool-call',
    'search_files': 'tool-call',
    'search_web': 'tool-call',
    'web_search': 'tool-call',
  };

  return colorMap[agent] || 'default';
}