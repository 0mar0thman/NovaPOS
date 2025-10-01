import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Can } from "@/components/Can";

interface RoleManagerProps {
  onRoleCreated: () => void;
}

const RoleManager = ({ onRoleCreated }: RoleManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/permissions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        setPermissions(response.data.permissions.map((p: any) => p.name));
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل في جلب الصلاحيات",
          variant: "destructive",
          duration: 3000,
        });
      }
    };
    fetchPermissions();
  }, [toast]);

  const handleCreateRole = async () => {
    if (!roleName) {
      setError("اسم الدور مطلوب");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/roles`,
        {
          name: roleName,
          permissions: selectedPermissions,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }
      );
      toast({
        title: "تم إنشاء الدور",
        description: response.data.message,
        variant: "default",
        duration: 3000,
      });
      setRoleName("");
      setSelectedPermissions([]);
      setError(null);
      setIsOpen(false);
      onRoleCreated();
    } catch (error: any) {
      setError(error.response?.data?.message || "فشل في إنشاء الدور");
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في إنشاء الدور",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const PermissionDeniedAlert = () => (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>غير مصرح</AlertTitle>
      <AlertDescription>ليس لديك صلاحية لإنشاء دور أو إدارة الصلاحيات.</AlertDescription>
    </Alert>
  );

  return (
    <Can action="create" subject="Role" >
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900"
          >
            إنشاء دور جديد
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-blue-600 dark:text-blue-400">إنشاء دور جديد</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              أدخل اسم الدور واختر الصلاحيات المرتبطة به.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName" className="text-gray-700 dark:text-gray-200">
                اسم الدور
              </Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => {
                  setRoleName(e.target.value);
                  setError(null);
                }}
                placeholder="أدخل اسم الدور"
                className={`border-blue-200 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${error ? "border-red-500" : ""}`}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <Can action="manage" subject="Permission" fallback={<PermissionDeniedAlert />}>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-200">الصلاحيات</Label>
                <div className="grid grid-cols-2 gap-2">
                  {permissions.map((permission) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={selectedPermissions.includes(permission)}
                        onCheckedChange={() => handlePermissionToggle(permission)}
                      />
                      <Label htmlFor={permission} className="text-gray-700 dark:text-gray-200">
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </Can>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreateRole}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 text-white"
              >
                إنشاء الدور
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Can>
  );
};

export default RoleManager;