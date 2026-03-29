import apiClient from './apiClient';

export interface PaymentRequest {
  item_type: 'subscription' | 'jackpot';
  item_id: string;
  duration_weeks?: number;
  phone?: string;
  email?: string;
  payment_method_id?: string;
}

export interface PaymentResponse {
  id: number;
  status: string;
  reference: string;
  transaction_id?: string;
}

export const paymentService = {
  payMpesa: async (data: PaymentRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>('/pay/mpesa', data);
    return response.data;
  },
  payPaypal: async (data: PaymentRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>('/pay/paypal', data);
    return response.data;
  },
  paySkrill: async (data: PaymentRequest): Promise<PaymentResponse> => {
    const response = await apiClient.post<PaymentResponse>('/pay/skrill', data);
    return response.data;
  },
  payPaystack: async (data: PaymentRequest): Promise<PaymentResponse & { access_code?: string; auth_url?: string }> => {
    const response = await apiClient.post<PaymentResponse & { access_code?: string; auth_url?: string }>('/pay/paystack', data);
    return response.data;
  },
  checkStatus: async (paymentId: number): Promise<PaymentResponse> => {
    const response = await apiClient.get<PaymentResponse>(`/pay/status/${paymentId}`);
    return response.data;
  },
};
