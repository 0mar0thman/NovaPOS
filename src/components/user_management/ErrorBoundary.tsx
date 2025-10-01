import React, { Component, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-white/90 dark:bg-slate-800 border-blue-100 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">حدث خطأ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-200">
              {this.state.errorMessage || "حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة أو التواصل مع الدعم."}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white"
            >
              إعادة تحميل الصفحة
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;