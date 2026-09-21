'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { Suspense } from 'react';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  
  const bookingId = searchParams.get('booking_id');
  const message = searchParams.get('message') || 'An error occurred while processing your payment.';
  const status = searchParams.get('status') || 'Failed';

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment {status}
        </h2>
        
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>

        {bookingId && (
          <div className="bg-gray-50 rounded-md p-4 mb-6 text-left">
            <p className="text-sm font-medium text-gray-500">Booking ID</p>
            <p className="mt-1 text-sm text-gray-900 font-mono">{bookingId}</p>
          </div>
        )}

        <div className="space-y-3">
          {bookingId ? (
            <Link
              href={`/booking/${bookingId}/payment`}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry Payment
            </Link>
          ) : (
            <button
              disabled
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
            >
              Retry Payment (No Booking Found)
            </button>
          )}

          <Link
            href="/customer/bookings"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View My Bookings
          </Link>

          <Link
            href="/events"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="flex h-40 w-full items-center justify-center">
          <div className="h-10 w-10 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
        </div>
      }>
        <PaymentFailedContent />
      </Suspense>
    </div>
  );
}
