import { z } from 'zod';

export const biteshipWebhookSchema = z
  .object({
    event: z.string().min(1),
    order_id: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    courier_waybill_id: z.string().min(1).optional(),
    courier_tracking_id: z.string().min(1).optional(),
    courier_company: z.string().min(1).optional(),
    courier_type: z.string().min(1).optional(),
    courier_driver_name: z.string().optional(),
    courier_driver_phone: z.string().optional(),
    price: z.number().optional(),
  })
  .passthrough();

export type BiteshipWebhookPayload = z.infer<typeof biteshipWebhookSchema>;
