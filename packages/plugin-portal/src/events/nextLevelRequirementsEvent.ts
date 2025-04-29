import { onboardingProvider } from '../providers/onboardingProvider';
import { generateNextLevelRequirementsMessage } from '../utils/helpers';
import { asUUID, createMessageMemory, IAgentRuntime, WorldPayload } from '@elizaos/core';

/**
 * Event handler to proactively send the next level requirements to the user.
 * Can be triggered after onboarding, level up, or world join.
 */
export async function nextLevelRequirementsEvent(payload: WorldPayload) {
  const { runtime, entities, rooms, world } = payload;
  const firstEntity = entities && entities.length > 0 ? entities[0] : null;
  const projectId = world?.id
    ? asUUID(world.id)
    : firstEntity?.id
      ? asUUID(firstEntity.id)
      : undefined;
  const entityId = firstEntity?.id ? asUUID(firstEntity.id) : undefined;
  const roomId = rooms && rooms.length > 0 && rooms[0].id ? asUUID(rooms[0].id) : undefined;
  if (!projectId || !entityId || !roomId) return;

  // Fetch onboarding state
  const memory = { entityId, roomId, content: { projectId } };
  const state = { projectId, values: {}, data: {}, text: '' };
  const onboarding = await onboardingProvider.get(runtime, memory, state);
  const currentLevel = onboarding.values?.level || 1;
  const nextLevelMessage = generateNextLevelRequirementsMessage(currentLevel, null, undefined);

  // Compose and store system message
  const systemMessage = createMessageMemory({
    entityId,
    agentId: runtime.agentId,
    roomId,
    content: {
      text: nextLevelMessage,
      type: 'system',
      onboardingLevel: currentLevel,
      onboardingRequirements: onboarding.values?.requirements,
    },
  });
  await runtime.createMemory(systemMessage, 'messages', true);
}
