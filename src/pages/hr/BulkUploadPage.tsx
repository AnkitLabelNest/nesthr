import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X } from 'lucide-react';

interface PreviewEmployee {
  name: string;
  email: string;
  role: string;
  department: string;
  manager: string;
  startDate: string;
  valid: boolean;
  errors?: string[];
}

const sampleData: PreviewEmployee[] = [
  { name: 'John Smith', email: 'john.smith@labelnest.com', role: 'Software Engineer', department: 'Engineering', manager: 'Sarah Chen', startDate: '2024-03-01', valid: true },
  { name: 'Jane Doe', email: 'jane.doe@labelnest.com', role: 'Product Designer', department: 'Design', manager: 'Lisa Wong', startDate: '2024-03-01', valid: true },
  { name: 'Bob Wilson', email: 'invalid-email', role: 'QA Engineer', department: 'Engineering', manager: 'Sarah Chen', startDate: '2024-03-01', valid: false, errors: ['Invalid email format'] },
  { name: '', email: 'mary.jones@labelnest.com', role: 'HR Specialist', department: 'Human Resources', manager: 'Rachel Green', startDate: '2024-03-01', valid: false, errors: ['Name is required'] },
];

const BulkUploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewEmployee[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Simulate processing
      setIsProcessing(true);
      setTimeout(() => {
        setPreviewData(sampleData);
        setIsProcessing(false);
      }, 1000);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
  };

  const validCount = previewData.filter(e => e.valid).length;
  const invalidCount = previewData.filter(e => !e.valid).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Bulk Upload</h1>
        <p className="text-muted-foreground">Import multiple employees at once using CSV or Excel files</p>
      </div>

      {/* Upload Area */}
      <Card className="p-8 glass-card">
        {!file ? (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Upload Employee Data</h3>
            <p className="text-muted-foreground mb-6">Drag and drop your CSV or Excel file here, or click to browse</p>
            <div className="flex items-center justify-center gap-4">
              <label className="cursor-pointer">
                <Input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Button asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: CSV, XLSX, XLS • Max file size: 5MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Processing file...</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Preview Table */}
      {previewData.length > 0 && !isProcessing && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidCount} errors
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClear}>Cancel</Button>
              <Button disabled={invalidCount > 0}>
                <Upload className="w-4 h-4 mr-2" />
                Import {validCount} Employees
              </Button>
            </div>
          </div>

          <Card className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((employee, idx) => (
                  <TableRow key={idx} className={!employee.valid ? 'bg-red-50' : ''}>
                    <TableCell>
                      {employee.valid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-xs text-red-600">{employee.errors?.join(', ')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{employee.name || '-'}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.manager}</TableCell>
                    <TableCell>{employee.startDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Instructions */}
      <Card className="p-6 glass-card">
        <h3 className="font-semibold text-foreground mb-4">File Format Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Required Columns</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Name (required)</li>
              <li>• Email (required, valid format)</li>
              <li>• Role (required)</li>
              <li>• Department (required)</li>
              <li>• Manager (required)</li>
              <li>• Start Date (YYYY-MM-DD format)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Tips</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Download the template for correct formatting</li>
              <li>• Ensure all emails are unique</li>
              <li>• Manager names must match existing employees</li>
              <li>• Remove any extra rows or columns</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BulkUploadPage;
