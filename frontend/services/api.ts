import { API_BASE_URL } from '@/constants/api';

console.log(`[API] API_BASE_URL = "${API_BASE_URL}"`);

export type UserRole = 'customer' | 'farmer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  phone_number: string;
  address: string;
  balance: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  avg_rating: number | null;
  ratings_count: number;
  total_sales: string | null;
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
  farmer_avg_rating: number | null;
  farmer_ratings_count: number;
  total_price: number;
  distance_km?: number;
  created_at: string;
  image: string | null ; 
}

export interface Order {
  id: number;
  customer: number;
  post: number;
  quantity_kg: string;
  status: 'pending' | 'shipped' | 'completed' | 'cancelled';
  total_paid: string;
  platform_fee: string;
  farmer_payout: string;
  delivery_address: string;
  post_title: string;
  post_farmer_name: string;
  post_farmer_id: number;
  customer_username: string;
  customer_name: string;
  created_at: string;
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
    console.log(`[API] This usually means the server is unreachable. Check: 1) Server is running, 2) HOST in api.ts matches server IP, 3) ALLOWED_HOSTS on server includes this IP`);
    throw new ApiError(`Network error: ${fetchErr.message}`, 0, null);
  }

  console.log(`[API] RESPONSE STATUS: ${response.status} ${response.statusText}`);

  let data: unknown = null;
  const text = await response.text();
  console.log(`[API] RAW RESPONSE TEXT:`, text);

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
    params?: { search?: string; lat?: number; lng?: number; radius?: number; farmer_id?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.lat) query.set('lat', String(params.lat));
    if (params?.lng) query.set('lng', String(params.lng));
    if (params?.radius) query.set('radius', String(params.radius));
    if (params?.farmer_id) query.set('farmer_id', String(params.farmer_id));
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

  createPost: async (
    token: string,
    body: {
      title: string;
      description: string;
      total_weight_kg: number;
      price_per_kg: number;
      latitude: number;
      longitude: number;
      imageUri?: string;
    },
  ) => {
    if (body.imageUri) {
      const formData = new FormData();
      formData.append('title', body.title);
      formData.append('description', body.description);
      formData.append('total_weight_kg', body.total_weight_kg.toString());
      formData.append('price_per_kg', body.price_per_kg.toString());
      formData.append('latitude', body.latitude.toString());
      formData.append('longitude', body.longitude.toString());
      
      const filename = body.imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // @ts-ignore
      formData.append('image', {
        uri: body.imageUri,
        name: filename,
        type,
      });

      const response = await fetch(`${API_BASE_URL}/posts/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
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

  completeOrder: (token: string, orderId: number) =>
    request<Order>(`/orders/${orderId}/complete/`, { method: 'POST' }, token),

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
      }
      const response = await fetch(`${API_BASE_URL}/reviews/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });
      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch { errorData = await response.text(); }
        throw new ApiError('Failed to create review', response.status, errorData);
      }
      return response.json() as Promise<Review>;
    }
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

  updateProfileInfo: (token: string, body: Partial<Pick<User, 'name' | 'phone_number' | 'address' | 'email' | 'latitude' | 'longitude'>>) =>
    request<User>(
      '/profile/update/',
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),

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
      imageUri?: string;
    },
  ) => {
    if (body.imageUri) {
      const formData = new FormData();
      if (body.title) formData.append('title', body.title);
      if (body.description) formData.append('description', body.description);
      if (body.total_weight_kg) formData.append('total_weight_kg', body.total_weight_kg.toString());
      if (body.price_per_kg) formData.append('price_per_kg', body.price_per_kg.toString());
      if (body.latitude) formData.append('latitude', body.latitude.toString());
      if (body.longitude) formData.append('longitude', body.longitude.toString());

      const filename = body.imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      // @ts-ignore
      formData.append('image', { uri: body.imageUri, name: filename, type });

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
