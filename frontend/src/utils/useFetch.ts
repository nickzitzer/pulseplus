import { useState, useEffect, useCallback } from 'react';
import api from './api';
import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface FetchOptions {
  initialFetch?: boolean;
  dependencies?: any[];
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Custom hook for data fetching with the PulsePlus API
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Fetch state and methods
 */
export function useFetch<T extends Record<string, any> = Record<string, any>>(
  url: string,
  options: FetchOptions = { initialFetch: true, dependencies: [] }
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: options.initialFetch !== false,
    error: null,
  });

  // Type guard for API response
  const isApiResponse = (data: any): data is ApiResponse<T> => 
    data && typeof data === 'object' && 'data' in data;

  /**
   * Fetch data from the API
   * @param params - Query parameters
   * @param config - Axios request config
   * @returns Promise with the response data
   */
  const fetchData = useCallback(async (
    params?: Record<string, any>,
    config?: Omit<AxiosRequestConfig, 'params'>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const mergedParams = { ...options.params, ...params };
      const response = await api.get<ApiResponse<T> | T>(url, { 
        params: mergedParams,
        headers: options.headers,
        ...config
      });
      
      // Handle both wrapped and unwrapped API responses
      const responseData = isApiResponse(response.data) ? response.data.data : response.data;
      
      // Check if response is paginated
      const pagination = isPaginatedResponse(response.data) ? {
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages,
        limit: response.data.limit || 20,
      } : undefined;
      
      setState({ 
        data: responseData as T, 
        loading: false, 
        error: null,
        pagination
      });
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (error) {
      const err = error as AxiosError;
      const errorMessage = getErrorMessage(err);
      const errorObj = new Error(errorMessage);
      
      setState({ data: null, loading: false, error: errorObj });
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [url, options.onSuccess, options.onError, options.params, options.headers]);

  /**
   * Post data to the API
   * @param data - Data to post
   * @param config - Axios request config
   * @returns Promise with the response data
   */
  const postData = useCallback(async (
    data: any,
    config?: AxiosRequestConfig
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.post<ApiResponse<T> | T>(url, data, {
        headers: options.headers,
        ...config
      });
      
      // Handle both wrapped and unwrapped API responses
      const responseData = isApiResponse(response.data) ? response.data.data : response.data;
      
      setState(prev => ({ ...prev, loading: false, error: null }));
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (error) {
      const err = error as AxiosError;
      const errorMessage = getErrorMessage(err);
      const errorObj = new Error(errorMessage);
      
      setState(prev => ({ ...prev, loading: false, error: errorObj }));
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [url, options.onSuccess, options.onError, options.headers]);

  /**
   * Update data via PUT request
   * @param data - Data to update
   * @param config - Axios request config
   * @returns Promise with the response data
   */
  const putData = useCallback(async (
    data: any,
    config?: AxiosRequestConfig
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.put<ApiResponse<T> | T>(url, data, {
        headers: options.headers,
        ...config
      });
      
      // Handle both wrapped and unwrapped API responses
      const responseData = isApiResponse(response.data) ? response.data.data : response.data;
      
      setState(prev => ({ ...prev, loading: false, error: null }));
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (error) {
      const err = error as AxiosError;
      const errorMessage = getErrorMessage(err);
      const errorObj = new Error(errorMessage);
      
      setState(prev => ({ ...prev, loading: false, error: errorObj }));
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [url, options.onSuccess, options.onError, options.headers]);

  /**
   * Delete data via DELETE request
   * @param config - Axios request config
   * @returns Promise with the response data
   */
  const deleteData = useCallback(async (config?: AxiosRequestConfig) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.delete<ApiResponse<T> | T>(url, {
        headers: options.headers,
        ...config
      });
      
      // Handle both wrapped and unwrapped API responses
      const responseData = isApiResponse(response.data) ? response.data.data : response.data;
      
      setState(prev => ({ ...prev, loading: false, error: null }));
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (error) {
      const err = error as AxiosError;
      const errorMessage = getErrorMessage(err);
      const errorObj = new Error(errorMessage);
      
      setState(prev => ({ ...prev, loading: false, error: errorObj }));
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      throw errorObj;
    }
  }, [url, options.onSuccess, options.onError, options.headers]);

  /**
   * Fetch paginated data
   * @param paginationOptions - Pagination options
   * @param params - Additional query parameters
   * @returns Promise with the paginated response
   */
  const fetchPage = useCallback(async (
    paginationOptions: PaginationOptions = {},
    params: Record<string, any> = {}
  ) => {
    const { page = 1, limit = 20 } = paginationOptions;
    return fetchData({
      ...params,
      page,
      limit
    });
  }, [fetchData]);

  /**
   * Fetch the next page of data
   * @param params - Additional query parameters
   * @returns Promise with the next page data
   */
  const fetchNextPage = useCallback(async (params: Record<string, any> = {}) => {
    if (!state.pagination) {
      throw new Error('No pagination information available');
    }
    
    const { page, pages } = state.pagination;
    
    if (page >= pages) {
      return null; // No more pages
    }
    
    return fetchPage({ page: page + 1, limit: state.pagination.limit }, params);
  }, [fetchPage, state.pagination]);

  /**
   * Fetch the previous page of data
   * @param params - Additional query parameters
   * @returns Promise with the previous page data
   */
  const fetchPreviousPage = useCallback(async (params: Record<string, any> = {}) => {
    if (!state.pagination) {
      throw new Error('No pagination information available');
    }
    
    const { page } = state.pagination;
    
    if (page <= 1) {
      return null; // No previous page
    }
    
    return fetchPage({ page: page - 1, limit: state.pagination.limit }, params);
  }, [fetchPage, state.pagination]);

  // Initial data fetch
  useEffect(() => {
    if (options.initialFetch !== false) {
      fetchData(options.params);
    }
  }, [fetchData, ...(options.dependencies || [])]);

  return {
    ...state,
    fetchData,
    postData,
    putData,
    deleteData,
    refetch: fetchData,
    fetchPage,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage: state.pagination ? state.pagination.page < state.pagination.pages : false,
    hasPreviousPage: state.pagination ? state.pagination.page > 1 : false,
  };
}

/**
 * Check if a response is paginated
 * @param response - API response
 * @returns Whether the response is paginated
 */
function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return (
    response &&
    typeof response === 'object' &&
    'items' in response &&
    'total' in response &&
    'page' in response &&
    'pages' in response
  );
}

/**
 * Extract error message from Axios error
 * @param error - Axios error
 * @returns Error message
 */
function getErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as any;
    
    // Check for API error format
    if (data.error && data.error.message) {
      return data.error.message;
    }
    
    // Check for simple message format
    if (data.message) {
      return data.message;
    }
  }
  
  return error.message || 'An unknown error occurred';
}

export default useFetch; 