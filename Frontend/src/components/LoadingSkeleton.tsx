interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'avatar' | 'table';
  count?: number;
}

const LoadingSkeleton = ({ type = 'card', count = 1 }: LoadingSkeletonProps) => {
  const skeletons = Array.from({ length: count }, (_, i) => {
    switch (type) {
      case 'card':
        return (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        );
      case 'text':
        return (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
          </div>
        );
      case 'avatar':
        return (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        );
      case 'table':
        return (
          <tr key={i} className="animate-pulse">
            <td className="py-3 px-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
            <td className="py-3 px-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
            <td className="py-3 px-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
          </tr>
        );
      default:
        return null;
    }
  });

  return <>{skeletons}</>;
};

export default LoadingSkeleton;