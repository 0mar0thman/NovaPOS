import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Trash2, Pencil, Loader2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import RoleFormModal from "./RoleFormModal";
import { Can } from "@/components/Can";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [currentPermission, setCurrentPermission] = useState(null);
  const [permissionForm, setPermissionForm] = useState({ name: "" });
  const { toast } = useToast();

  const PermissionDeniedAlert = () => (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>غير مصرح</AlertTitle>
      <AlertDescription>ليس لديك صلاحية لإدارة الأدوار.</AlertDescription>
    </Alert>
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          axios.get(`/api/roles`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }),
          axios.get(`/api/permissions`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } })
        ]);
        setRoles(rolesRes.data.roles);
        setPermissions(permsRes.data.permissions);
      } catch (error: any) {
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل في جلب البيانات",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleEditRole = (role) => {
    setCurrentRole(role);
    setIsRoleDialogOpen(true);
  };

  const handleDeleteRole = async (id) => {
    try {
      await axios.delete(`/api/roles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      setRoles(roles.filter((role) => role.id !== id));
      toast({
        title: "تم حذف الدور",
        description: "تم حذف الدور بنجاح",
        variant: "default",
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل في حذف الدور",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleRoleUpdated = (updatedRole) => {
    const updated = roles.map((r) => (r.id === updatedRole.id ? updatedRole : r));
    setRoles(updated);
  };

  // Permissions CRUD
  const handleEditPermission = (perm) => {
    setCurrentPermission(perm);
    setPermissionForm({ name: perm.name });
    setIsPermissionDialogOpen(true);
  };

  const handleDeletePermission = async (id) => {
    try {
      await axios.delete(`/api/permissions/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      setPermissions(permissions.filter((p) => p.id !== id));
      toast({
        title: "تم حذف الصلاحية",
        variant: "default",
      });
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handlePermissionSubmit = async (e) => {
    e.preventDefault();
    const method = currentPermission ? 'put' : 'post';
    const url = currentPermission ? `/api/permissions/${currentPermission.id}` : '/api/permissions';
    try {
      const response = await axios[method](url, permissionForm, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      const updatedPerms = currentPermission 
        ? permissions.map((p) => (p.id === response.data.permission.id ? response.data.permission : p))
        : [...permissions, response.data.permission];
      setPermissions(updatedPerms);
      setIsPermissionDialogOpen(false);
      toast({ title: "تم العملية" });
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6 dark:bg-slate-900 transition-all duration-300" dir="rtl">
      <Can action="read" subject="Role" fallback={<PermissionDeniedAlert />}>
        <Card className="bg-white/90 dark:bg-slate-800 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-xl rounded-xl transition-all duration-300">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-blue-800 dark:text-blue-300 text-2xl font-bold">
                إدارة الأدوار
              </CardTitle>
              <Can action="create" subject="Role">
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900">
                      إنشاء دور جديد
                    </Button>
                  </DialogTrigger>
                  <RoleFormModal role={currentRole} onClose={() => setIsRoleDialogOpen(false)} onRoleUpdated={handleRoleUpdated} />
                </Dialog>
              </Can>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-blue-100 dark:bg-slate-700">
                  <TableRow>
                    <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">اسم الدور</TableHead>
                    <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">الصلاحيات</TableHead>
                    <Can action="update" subject="Role" fallback={<TableHead />}>
                      <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">إجراءات</TableHead>
                    </Can>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-gray-100 dark:hover:bg-slate-600">
                        <TableCell className="font-medium dark:text-gray-200">{role.name}</TableCell>
                        <TableCell className="dark:text-gray-200">{role.permissions.join(", ") || "بدون صلاحيات"}</TableCell>
                        <Can action="update" subject="Role" fallback={<TableCell />}>
                          <TableCell className="flex gap-2 justify-end">
                            <Can action="update" subject="Role">
                              <Button
                                variant="outline"
                                onClick={() => handleEditRole(role)}
                                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900"
                              >
                                <Pencil className="w-4 h-4 ml-2" />
                                تعديل
                              </Button>
                            </Can>
                            <Can action="delete" subject="Role">
                              <Button
                                variant="destructive"
                                onClick={() => handleDeleteRole(role.id)}
                                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف
                              </Button>
                            </Can>
                          </TableCell>
                        </Can>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        لا يوجد أدوار متاحة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* قسم Permissions */}
        <Can action="read" subject="Permission" fallback={<PermissionDeniedAlert />}>
          <Card className="bg-white/90 dark:bg-slate-800 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-xl rounded-xl transition-all duration-300">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-blue-800 dark:text-blue-300 text-2xl font-bold">
                  إدارة الصلاحيات
                </CardTitle>
                <Can action="create" subject="Permission">
                  <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>إنشاء صلاحية جديدة</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{currentPermission ? "تعديل الصلاحية" : "إنشاء صلاحية جديدة"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePermissionSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">اسم الصلاحية</Label>
                          <Input id="name" value={permissionForm.name} onChange={(e) => setPermissionForm({ name: e.target.value })} />
                        </div>
                        <Button type="submit">حفظ</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </Can>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الصلاحية</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm}>
                      <TableCell>{perm}</TableCell>
                      <TableCell>
                        <Can action="update" subject="Permission">
                          <Button onClick={() => handleEditPermission({ name: perm })}><Pencil /></Button>
                        </Can>
                        <Can action="delete" subject="Permission">
                          <Button variant="destructive" onClick={() => handleDeletePermission(perm)}><Trash2 /></Button>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Can>
      </Can>
    </div>
  );
};

export default RoleList;