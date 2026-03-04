import { AxiosError } from 'axios';
import { toast } from 'sonner';

// Define a type for error objects with a status property
interface ErrorWithStatus {
  status?: number | string;
  message?: string;
  [key: string]: unknown;
}

// Type guard to check if an object has a status property
function hasStatus(error: unknown): error is ErrorWithStatus {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error
  );
}

// Type guard to check if an object has a message property
function hasMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// Type guard to check if an error is an AxiosError
function isAxiosError(error: unknown): error is { 
  isAxiosError: boolean;
  response?: {
    status: number;
    data?: Record<string, unknown>;
  };
  request?: unknown;
  message: string;
} {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError === true
  );
}

export function handleServerError(error: unknown): void {
  // Log the error for debugging
  console.error('Server error:', error);

  let errMsg = 'Something went wrong!';

  // Handle Axios errors
  if (isAxiosError(error)) {
    const response = error.response;
    
    if (response) {
      // The request was made and the server responded with a status code
      const responseData = response.data as Record<string, unknown> | undefined;
      
      // Try to get the error message from different possible locations
      if (responseData) {
        if (typeof responseData.message === 'string') {
          errMsg = responseData.message;
        } else if (typeof responseData.title === 'string') {
          errMsg = responseData.title;
        } else if (typeof responseData.error === 'string') {
          errMsg = responseData.error;
        }
      }
      
      // Handle specific status codes
      if (response.status === 401) {
        errMsg = 'Session expired. Please log in again.';
      } else if (response.status === 403) {
        errMsg = 'You do not have permission to perform this action.';
      } else if (response.status === 404) {
        errMsg = 'The requested resource was not found.';
      } else if (response.status >= 500) {
        errMsg = 'Internal server error. Please try again later.';
      }
    } else if (error.request) {
      // The request was made but no response was received
      errMsg = 'No response from server. Please check your connection.';
    } else if (error.message) {
      // Something happened in setting up the request
      errMsg = `Request error: ${error.message}`;
    }
  } 
  // Handle error objects with status
  else if (hasStatus(error)) {
    const status = error.status;
    if (typeof status === 'number' && status === 204) {
      errMsg = 'Content not found.';
    }
    
    // If there's a message, use it
    if (hasMessage(error)) {
      errMsg = error.message;
    }
  }
  // Handle error objects with just a message
  else if (hasMessage(error)) {
    errMsg = error.message;
  }
  // Handle string errors
  else if (typeof error === 'string') {
    errMsg = error;
  }
  // Handle Error instances
  else if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    errMsg = (error as { message: string }).message;
  }

  // Show error toast
  toast.error(errMsg, { duration: 2000 });
}
