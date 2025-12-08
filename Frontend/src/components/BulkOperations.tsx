import { useState } from 'react';
import { Upload, Download, Users, Check, X } from 'lucide-react';

interface BulkOperationsProps {
  onBulkEnroll: (file: File) => void;
  onBulkExport: () => void;
  onBulkAttendance: (studentIds: string[]) => void;
}

const BulkOperations = ({ onBulkEnroll, onBulkExport, onBulkAttendance }: BulkOperationsProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
    }
  };

  const processBulkEnroll = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      await onBulkEnroll(selectedFile);
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
      <h3 className="text-lg font-semibold mb-4">Bulk Operations</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bulk Enrollment */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            <h4 className="font-medium">Bulk Enrollment</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">Upload CSV file with student data</p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="bulk-upload"
          />
          <label
            htmlFor="bulk-upload"
            className="block w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500"
          >
            {selectedFile ? selectedFile.name : 'Choose CSV file'}
          </label>
          
          {selectedFile && (
            <button
              onClick={processBulkEnroll}
              disabled={isProcessing}
              className="w-full mt-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Upload & Enroll'}
            </button>
          )}
        </div>

        {/* Bulk Export */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Download className="w-5 h-5 mr-2 text-green-600" />
            <h4 className="font-medium">Bulk Export</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">Export all attendance data</p>
          <button
            onClick={onBulkExport}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Export All Data
          </button>
        </div>

        {/* Bulk Attendance */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            <h4 className="font-medium">Bulk Attendance</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">Mark attendance for all students</p>
          <div className="flex space-x-2">
            <button
              onClick={() => onBulkAttendance(['all-present'])}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 text-sm"
            >
              <Check className="w-4 h-4 inline mr-1" />
              All Present
            </button>
            <button
              onClick={() => onBulkAttendance(['all-absent'])}
              className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 text-sm"
            >
              <X className="w-4 h-4 inline mr-1" />
              All Absent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOperations;