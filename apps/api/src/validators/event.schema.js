import { z } from 'zod';
const dimension = z.number().int().positive().max(100000);
export const pageUrlSchema = z.string().url().max(2048)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'URL must use HTTP or HTTPS')
  .transform((value) => { const url = new URL(value); return url.origin + url.pathname; });
const clickSchema = z.object({
  x: z.number().min(0).max(100000), y: z.number().min(0).max(100000),
  viewport_width: dimension, viewport_height: dimension,
  document_width: dimension, document_height: dimension,
});
export const eventSchema = z.object({
  site_id: z.string().min(1).max(100),
  event_id: z.string().uuid(),
  session_id: z.string().min(8).max(100),
  event_type: z.enum(['page_view', 'click']),
  page_url: pageUrlSchema,
  timestamp: z.string().datetime(),
  click: clickSchema.optional(),
}).refine((event) => event.event_type !== 'click' || !!event.click, {
  message: 'click data is required for click events', path: ['click'],
});
