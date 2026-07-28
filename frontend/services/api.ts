import { API_BASE_URL } from '@/constants/api';

console.log(`[API] API_BASE_URL = "${API_BASE_URL}"`);

export type UserRole = 'customer' | 'farmer' | 'deliveryman';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  phone_number: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  avg_rating: number | null;
  ratings_count: number;
  total_sales: string | null;
  profile_picture: string | null;
  service_areas: number[] | null;
  division: string;
  district: string;
  upazila: string;
  union: string;
}

export interface ProductType {
  id: number;
  name_en: string;
  name_bn: string;
  max_price_limit: string | null;
  created_at: string;
}

export interface PostImage {
  id: number;
  image: string | null;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  description: string;
  total_weight_kg: string;
  price_per_kg: string;
  latitude: number;
  longitude: number;
  farmer: number;
  farmer_name: string;
  farmer_username: string;
  farmer_phone: string;
  farmer_avg_rating: number | null;
  farmer_ratings_count: number;
  product_type: number | null;
  product_type_name_bn: string | null;
  images: PostImage[];
  total_price: number;
  distance_km?: number;
  created_at: string;
  image: string | null ;
  collection_district: string;
  collection_upazila: string;
  collection_union: string;
  collection_ward: string;
  collection_point_address: string;
}

export interface Order {
  id: number;
  customer: number;
  post: number;
  quantity_kg: string;
  status: 'pending' | 'shipped' | 'assigned' | 'out_for_delivery' | 'completed' | 'cancelled';
  total_paid: string;
  platform_fee: string;
  farmer_payout: string;
  delivery_address: string;
  deliveryman: number | null;
  deliveryman_name: string | null;
  deliveryman_username: string | null;
  deliveryman_phone: string | null;
  post_title: string;
  post_farmer_name: string;
  post_farmer_id: number;
  post_farmer_phone: string;
  post_collection_district: string;
  post_collection_upazila: string;
  post_collection_union: string;
  post_collection_ward: string;
  post_collection_point_address: string;
  post_latitude: number;
  post_longitude: number;
  customer_username: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  distance_km?: number;
}

export interface ReviewImage {
  id: number;
  image: string | null;
  image_url: string | null;
}

export interface Review {
  id: number;
  post: number;
  customer: number;
  rating: number;
  comment: string;
  farmer_username: string;
  farmer_id: number;
  post_title: string;
  customer_username: string;
  images: ReviewImage[];
  created_at: string;
}

export interface BangladeshLocation {
  id: number;
  name_en: string;
  name_bn: string;
  level: 'division' | 'district' | 'upazila' | 'union' | 'ward';
  parent: number | null;
}

export interface DeliverymanPackage {
  total_orders: number;
  total_amount: number;
  farmer_count: number;
  farmers: Array<{
    farmer_id: number;
    farmer_name: string;
    farmer_phone: string;
    products: Array<{
      order_id: number;
      product_title: string;
      quantity_kg: string;
      total_paid: string;
    }>;
    total_amount: number;
    collection_district: string;
    collection_upazila: string;
    collection_union: string;
    collection_ward: string;
    collection_point_address: string;
  }>;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`[API] REQUEST: ${options.method || 'GET'} ${url}`);
  if (options.body) console.log(`[API] BODY:`, options.body);

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (fetchErr: any) {
    console.log(`[API] FETCH ERROR: ${fetchErr.message}`);
    throw new ApiError(`Network error: ${fetchErr.message}`, 0, null);
  }

  let data: unknown = null;
  const text = await response.text();
  console.log(`[API] ${response.status} ${response.statusText}`);

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    console.log(`[API] ERROR DATA:`, JSON.stringify(data, null, 2));
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: string }).error)
        : typeof data === 'object' && data !== null && 'non_field_errors' in data
          ? String((data as { non_field_errors: string[] }).non_field_errors[0])
          : `Request failed (${response.status})`;
    console.log(`[API] THROWING: "${message}"`);
    throw new ApiError(message, response.status, data);
  }

  console.log(`[API] SUCCESS DATA:`, JSON.stringify(data).substring(0, 200));
  return data as T;
}

export const api = {
  register: (body: {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    name?: string;
    phone_number?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    request<{ token: string; user: User }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (email_or_phone: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email_or_phone, password }),
    }),

  getProfile: (token: string) =>
    request<User>('/auth/profile/', { method: 'GET' }, token),

  updateProfile: (token: string, body: Partial<User>) =>
    request<User>(
      '/auth/profile/',
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),

  getPosts: (
    token: string | null,
    params?: { search?: string; lat?: number; lng?: number; radius?: number; farmer_id?: number; product_type?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.lat) query.set('lat', String(params.lat));
    if (params?.lng) query.set('lng', String(params.lng));
    if (params?.radius) query.set('radius', String(params.radius));
    if (params?.farmer_id) query.set('farmer_id', String(params.farmer_id));
    if (params?.product_type) query.set('product_type', String(params.product_type));
    const qs = query.toString();
    return request<Post[]>(`/posts/${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
  },

  searchByKeyword: (
    q: string,
    lat: number,
    lng: number,
    token?: string | null,
  ) =>
    request<Post[]>(
      `/posts/search_by_keyword/?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}`,
      { method: 'GET' },
      token,
    ),

  getPost: (id: number, token?: string | null) =>
    request<Post>(`/posts/${id}/`, { method: 'GET' }, token),

  getProductTypes: (token?: string | null) =>
    request<ProductType[]>('/product-types/', { method: 'GET' }, token),

  createPost: async (
    token: string,
    body: {
      title: string;
      description: string;
      total_weight_kg: number;
      price_per_kg: number;
      latitude: number;
      longitude: number;
      product_type?: number;
      imageUris?: string[];
    },
  ) => {
    const hasImages = body.imageUris && body.imageUris.length > 0;
    if (hasImages || body.product_type) {
      const formData = new FormData();
      formData.append('title', body.title);
      formData.append('description', body.description);
      formData.append('total_weight_kg', body.total_weight_kg.toString());
      formData.append('price_per_kg', body.price_per_kg.toString());
      formData.append('latitude', body.latitude.toString());
      formData.append('longitude', body.longitude.toString());
      if (body.product_type) formData.append('product_type', String(body.product_type));
      for (const uri of (body.imageUris || []).slice(0, 3)) {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        // @ts-ignore
        formData.append('uploaded_images', { uri, name: filename, type });
      }

      const response = await fetch(`${API_BASE_URL}/posts/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch { errorData = await response.text(); }
        throw new ApiError('Failed to create post', response.status, errorData);
      }

      return response.json() as Promise<Post>;
    } else {
      return request<Post>(
        '/posts/',
        { method: 'POST', body: JSON.stringify(body) },
        token,
      );
    }
  },

  getOrders: (token: string) =>
    request<Order[]>('/orders/', { method: 'GET' }, token),

  createOrder: (
    token: string,
    body: { post: number; quantity_kg: string; delivery_address: string },
  ) =>
    request<Order>(
      '/orders/',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

  shipOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/ship/`, { method: 'POST' }, token),

  acceptOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/accept/`, { method: 'POST' }, token),

  pickupOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/pickup/`, { method: 'POST' }, token),

  deliverOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/deliver/`, { method: 'POST' }, token),

  completeOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/complete/`, { method: 'POST' }, token),

  getAvailableOrders: (token: string, params?: { lat?: number; lng?: number; radius?: number }) => {
    const query = new URLSearchParams();
    if (params?.lat) query.set('lat', String(params.lat));
    if (params?.lng) query.set('lng', String(params.lng));
    if (params?.radius) query.set('radius', String(params.radius));
    const qs = query.toString();
    return request<Order[]>(`/orders/available/${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
  },

  createBulkOrders: (token: string, items: { post: number; quantity_kg: string }[], delivery_address: string) =>
    request<Order[]>(
      '/orders/bulk_create/',
      { method: 'POST', body: JSON.stringify({ items, delivery_address }) },
      token,
    ),

  cancelOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/cancel/`, { method: 'POST' }, token),

  createReview: (
    token: string,
    body: { post: number; rating: number; comment: string },
  ) =>
    request<Review>(
      '/reviews/',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),

  createReviewWithImages: async (
    token: string,
    body: { post: number; rating: number; comment: string; imageUris?: string[] },
  ) => {
    console.log(`[API createReviewWithImages] post=${body.post} rating=${body.rating} images=${body.imageUris?.length ?? 0}`);

    if (body.imageUris && body.imageUris.length > 0) {
      const formData = new FormData();
      formData.append('post', String(body.post));
      formData.append('rating', String(body.rating));
      formData.append('comment', body.comment);
      for (const uri of body.imageUris.slice(0, 3)) {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        // @ts-ignore
        formData.append('uploaded_images', { uri, name: filename, type });
        console.log(`[API createReviewWithImages] Appended image: ${filename} (${type})`);
      }
      const response = await fetch(`${API_BASE_URL}/reviews/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      console.log(`[API createReviewWithImages] Response status=${response.status}`);
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log(`[API createReviewWithImages] Error JSON:`, errorData);
        } catch {
          errorData = await response.text();
          console.log(`[API createReviewWithImages] Error text:`, errorData);
        }
        const msg = typeof errorData === 'object' && errorData !== null
          ? (errorData as any).non_field_errors || (errorData as any).detail || JSON.stringify(errorData)
          : String(errorData);
        throw new ApiError(msg, response.status, errorData);
      }
      const data = await response.json();
      console.log(`[API createReviewWithImages] Success — review #${data.id}, images=${data.images?.length ?? 0}`);
      return data as Review;
    }
    console.log(`[API createReviewWithImages] No images, falling back to JSON createReview`);
    return api.createReview(token, { post: body.post, rating: body.rating, comment: body.comment });
  },

  getReviews: (postId: number) =>
    request<Review[]>(`/reviews/?post_id=${postId}`, { method: 'GET' }),

  getReviewsByCustomer: (token: string, customerId: number) =>
    request<Review[]>(`/reviews/?customer_id=${customerId}`, { method: 'GET' }, token),

  getFarmerWallet: (token: string) =>
    request<{
      balance: string;
      pending_payouts: string;
      total_earnings: string;
      total_commission_deductions: string;
      recent_transactions: Order[];
    }>('/farmer/wallet/', { method: 'GET' }, token),

  updateProfileInfo: (token: string, body: Partial<Pick<User, 'name' | 'phone_number' | 'address' | 'email' | 'latitude' | 'longitude' | 'profile_picture'>>) =>
    request<User>(
      '/profile/update/',
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),

  // ── BKASH PAYMENT API ──────────────────────────────────────────────────
  initiateBkashPayment: (token: string, amount: number) =>
    request<{
      payment_id: number;
      transaction_id: string;
      bkash_url: string;
      payment_id_bkash: string;
      amount: string;
    }>('/payments/bkash/initiate/', { method: 'POST', body: JSON.stringify({ amount }) }, token),

  getBkashPaymentStatus: (token: string, transactionId: string) =>
    request<{
      transaction_id: string;
      amount: string;
      status: 'initiated' | 'success' | 'failed' | 'cancelled';
      gateway: string;
      bkash_payment_id: string;
      bkash_trx_id: string;
      created_at: string;
    }>(`/payments/bkash/status/${transactionId}/`, { method: 'GET' }, token),

  // ── DELIVERYMAN API ────────────────────────────────────────────────────
  getDeliverymanDashboard: (token: string, params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    tab?: 'available' | 'my-deliveries';
  }) => {
    const query = new URLSearchParams();
    if (params?.lat) query.set('lat', String(params.lat));
    if (params?.lng) query.set('lng', String(params.lng));
    if (params?.radius) query.set('radius', String(params.radius));
    if (params?.tab) query.set('tab', params.tab);
    const qs = query.toString();
    return request<{
      orders: Order[];
      package_summary: DeliverymanPackage;
    }>(`/deliveryman/dashboard/${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
  },

  getServiceAreas: (token: string) =>
    request<{ service_areas: number[] }>('/deliveryman/service-areas/', { method: 'GET' }, token),

  setServiceAreas: (token: string, serviceAreas: number[]) =>
    request<{ status: string; service_areas: number[] }>(
      '/deliveryman/service-areas/',
      { method: 'POST', body: JSON.stringify({ service_areas: serviceAreas }) },
      token,
    ),

  getLocations: (level?: string, parentId?: number) => {
    const query = new URLSearchParams();
    if (level) query.set('level', level);
    if (parentId !== undefined) query.set('parent_id', String(parentId));
    const qs = query.toString();
    return request<BangladeshLocation[]>(`/locations/${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  // ── SSLCOMMERZ (deprecated — kept for backward compatibility) ──────────
  initiatePayment: (token: string, amount: number) =>
    request<{
      payment_id: number;
      transaction_id: string;
      gateway_url: string;
      amount: string;
    }>('/payments/initiate/', { method: 'POST', body: JSON.stringify({ amount }) }, token),

  getPaymentStatus: (token: string, transactionId: string) =>
    request<{
      transaction_id: string;
      amount: string;
      status: 'initiated' | 'success' | 'failed' | 'cancelled';
      created_at: string;
    }>(`/payments/status/${transactionId}/`, { method: 'GET' }, token),

  deletePost: (token: string, id: number) =>
    request<void>(`/posts/${id}/`, { method: 'DELETE' }, token),

  updatePost: async (
    token: string,
    id: number,
    body: {
      title?: string;
      description?: string;
      total_weight_kg?: number;
      price_per_kg?: number;
      latitude?: number;
      longitude?: number;
      product_type?: number;
      imageUris?: string[];
    },
  ) => {
    const hasImages = body.imageUris && body.imageUris.length > 0;
    if (hasImages || body.product_type) {
      const formData = new FormData();
      if (body.title) formData.append('title', body.title);
      if (body.description) formData.append('description', body.description);
      if (body.total_weight_kg) formData.append('total_weight_kg', body.total_weight_kg.toString());
      if (body.price_per_kg) formData.append('price_per_kg', body.price_per_kg.toString());
      if (body.latitude) formData.append('latitude', body.latitude.toString());
      if (body.longitude) formData.append('longitude', body.longitude.toString());
      if (body.product_type) formData.append('product_type', String(body.product_type));
      for (const uri of (body.imageUris || []).slice(0, 3)) {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        // @ts-ignore
        formData.append('uploaded_images', { uri, name: filename, type });
      }

      const response = await fetch(`${API_BASE_URL}/posts/${id}/update/`, {
        method: 'PATCH',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch { errorData = await response.text(); }
        throw new ApiError('Failed to update post', response.status, errorData);
      }

      return response.json() as Promise<Post>;
    } else {
      return request<Post>(
        `/posts/${id}/update/`,
        { method: 'PATCH', body: JSON.stringify(body) },
        token,
      );
    }
  },

  forgotPassword: (email: string, method: 'email' | 'sms' = 'email') =>
    request<{ message: string }>('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email, method }),
    }),

  resetPassword: (email: string, otp: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password/', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password }),
    }),
};

export { ApiError };
