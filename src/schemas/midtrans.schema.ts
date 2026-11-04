import { z } from 'zod';

const stringValue = z.union([z.string(), z.number()]).transform(String);

export const midtransWebhookSchema = z
  .object({
    order_id: z.string().min(1),
    status_code: stringValue,
    gross_amount: stringValue,
    signature_key: z.string().min(1),
    transaction_status: z.string().min(1),
    fraud_status: z.string().optional(),
    transaction_id: z.string().optional(),
    payment_type: z.string().optional(),
  })
  .passthrough();

export type MidtransWebhookPayload = z.infer<typeof midtransWebhookSchema>;
