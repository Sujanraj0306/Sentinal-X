import React from 'react';

class ErrorBoundary extends React.Component {
     constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
     }

     static getDerivedStateFromError(error) {
          return { hasError: true, error };
     }

     componentDidCatch(error, errorInfo) {
          console.error('ErrorBoundary caught an error:', error, errorInfo);
     }

     render() {
          if (this.state.hasError) {
               return (
                    <div className="flex flex-col items-center justify-center p-8 h-full bg-red-50 text-red-900 font-sans border-2 border-red-500 m-4 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]">
                         <h2 className="text-xl font-bold uppercase tracking-widest mb-4">UI Render Error</h2>
                         <p className="font-mono text-sm">{this.state.error?.message || 'Something went wrong.'}</p>
                         <button
                              onClick={() => this.setState({ hasError: false })}
                              className="mt-4 px-4 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-1 active:translate-y-1"
                         >
                              Try Again
                         </button>
                    </div>
               );
          }

          return this.props.children;
     }
}

export default ErrorBoundary;
