import { z } from "zod";

const timestampSchema = z.iso.datetime({ offset: true });

export const messagingUserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  full_name: z.string(),
});

export const messageSchema = z.object({
  id: z.uuid(),
  conversation: z.uuid(),
  sender: messagingUserSchema.nullable(),
  text: z.string(),
  link: z.string(),
  created_at: timestampSchema,
});

const envelopeBaseSchema = z.object({
  version: z.number().int(),
  id: z.uuid(),
  type: z.string(),
  occurred_at: timestampSchema,
  data: z.unknown(),
});

export const realtimeEventSchema = z.discriminatedUnion("type", [
  envelopeBaseSchema.extend({
    version: z.literal(1),
    type: z.literal("messaging.message_created"),
    data: z.object({
      conversation_id: z.uuid(),
      message: messageSchema,
    }),
  }),
  envelopeBaseSchema.extend({
    version: z.literal(1),
    type: z.literal("messaging.conversation_created"),
    data: z.object({ conversation_id: z.uuid() }),
  }),
  envelopeBaseSchema.extend({
    version: z.literal(1),
    type: z.literal("messaging.conversation_read"),
    data: z.object({
      conversation_id: z.uuid(),
      read_at: timestampSchema,
    }),
  }),
]);

export type MessagingUser = z.infer<typeof messagingUserSchema>;
export type Message = z.infer<typeof messageSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

export type RealtimeParseResult =
  | { kind: "event"; event: RealtimeEvent }
  | { kind: "unsupported"; version?: number; type?: string }
  | { kind: "invalid"; error: z.ZodError | SyntaxError };

export function parseRealtimeEvent(value: unknown): RealtimeParseResult {
  let decoded = value;
  if (typeof value === "string") {
    try {
      decoded = JSON.parse(value) as unknown;
    } catch (error) {
      return { kind: "invalid", error: error as SyntaxError };
    }
  }

  const envelope = envelopeBaseSchema.safeParse(decoded);
  if (!envelope.success) return { kind: "invalid", error: envelope.error };
  if (envelope.data.version !== 1) {
    return {
      kind: "unsupported",
      version: envelope.data.version,
      type: envelope.data.type,
    };
  }

  const event = realtimeEventSchema.safeParse(decoded);
  if (!event.success) {
    const knownType = realtimeEventSchema.options.some(
      (schema) => schema.shape.type.value === envelope.data.type,
    );
    return knownType
      ? { kind: "invalid", error: event.error }
      : { kind: "unsupported", version: 1, type: envelope.data.type };
  }
  return { kind: "event", event: event.data };
}
