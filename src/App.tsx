// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { AbilityContext, initialAbility, createAppAbility, AppAbility } from "@/config/ability";
// import { useState } from "react";
// import ErrorBoundary from "@/components/user_management/ErrorBoundary";
// import "./assets/fonts/fonts.css";
// import Index from "./pages/Index";
// import NotFound from "./pages/NotFound";
// import Login from "@/pages/LoginPage";
// import MainLayout from "@/layouts/MainLayout";
// import AuthGuard from "@/pages/AuthGuard";
// import { mapBackendPermissions } from "@/config/abilityMapper";

// const queryClient = new QueryClient();

// const App = () => {
//   // محاولة تحميل الصلاحيات المخزنة من localStorage
//   const savedPermissions = localStorage.getItem("permissions");
//   const initialAppAbility: AppAbility = savedPermissions
//     ? createAppAbility(mapBackendPermissions(JSON.parse(savedPermissions)))
//     : initialAbility;

//   const [ability, setAbility] = useState<AppAbility>(initialAppAbility);

//   return (
//     <AbilityContext.Provider value={ability}>
//       <QueryClientProvider client={queryClient}>
//         <TooltipProvider>
//           <Toaster />
//           <Sonner />
//           <BrowserRouter>
//             <Routes>
//               <Route path="/login" element={<Login setAbility={setAbility} />} />
//               <Route
//                 element={
//                   <AuthGuard>
//                     <ErrorBoundary>
//                       <MainLayout />
//                     </ErrorBoundary>
//                   </AuthGuard>
//                 }
//               >
//                 <Route path="/" element={<Index />} />
//               </Route>
//               <Route path="*" element={<NotFound />} />
//             </Routes>
//           </BrowserRouter>
//         </TooltipProvider>
//       </QueryClientProvider>
//     </AbilityContext.Provider>
//   );
// };

// export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import {
  AbilityContext,
  initialAbility,
  createAppAbility,
  AppAbility,
} from "@/config/ability";
import { useState, useEffect } from "react";
import ErrorBoundary from "@/components/user_management/ErrorBoundary";
import "./assets/fonts/fonts.css";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "@/pages/NotFound";
import Login from "@/pages/LoginPage";
import MainLayout from "@/layouts/MainLayout";
import AuthGuard from "@/pages/AuthGuard";
import { mapBackendPermissions } from "@/config/abilityMapper";
import { UserProvider } from "@/components/dashboard/UserContext";
import api from "@/lib/axios";

const queryClient = new QueryClient();

const App = () => {
  const savedPermissions = localStorage.getItem("permissions");
  const initialAppAbility: AppAbility = savedPermissions
    ? createAppAbility(mapBackendPermissions(JSON.parse(savedPermissions)))
    : initialAbility;

  const [ability, setAbility] = useState<AppAbility>(initialAppAbility);

  // مزامنة الـ ability مع localStorage عند التغيير
  useEffect(() => {
    const handleStorageChange = () => {
      const newPermissions = localStorage.getItem("permissions");
      if (newPermissions) {
        const rules = mapBackendPermissions(JSON.parse(newPermissions));
        setAbility(createAppAbility(rules));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
  // اختبار البروكسي
  const testProxy = async () => {
    try {
      const response = await api.get('/sanctum/csrf-cookie');
      console.log('✅ البروكسي يعمل بنجاح:', response.status);
    } catch (error) {
      console.error('❌ مشكلة في البروكسي:', error);
    }
  };
  
  testProxy();
}, []);

  return (
    <AbilityContext.Provider value={ability}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <UserProvider>
            <HashRouter>
              <Routes>
                {/* صفحة Login - متاحة للجميع */}
                <Route
                  path="/login"
                  element={<Login setAbility={setAbility} />}
                />

                {/* صفحة غير مصرح - متاحة للجميع */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* المسارات المحمية */}
                <Route
                  path="/"
                  element={
                    <AuthGuard>
                      <ErrorBoundary>
                        <MainLayout />
                      </ErrorBoundary>
                    </AuthGuard>
                  }
                >
                  {/* الصفحة الرئيسية - تتطلب صلاحية view على dashboard */}
                  <Route
                    index
                    element={
                      <AuthGuard action="view" subject="Dashboard">
                        <Index />
                      </AuthGuard>
                    }
                  />

                  {/* مسارات أخرى مع صلاحيات محددة */}
                  <Route
                    path="sales"
                    element={
                      <AuthGuard action="manage" subject="Sales">
                        <div>صفحة المبيعات</div>
                      </AuthGuard>
                    }
                  />

                  <Route
                    path="products"
                    element={
                      <AuthGuard action="manage" subject="Product">
                        <div>صفحة المنتجات</div>
                      </AuthGuard>
                    }
                  />

                  <Route
                    path="users"
                    element={
                      <AuthGuard action="manage" subject="User">
                        <div>صفحة المستخدمين</div>
                      </AuthGuard>
                    }
                  />

                  <Route
                    path="reports"
                    element={
                      <AuthGuard action="view" subject="Report">
                        <div>صفحة التقارير</div>
                      </AuthGuard>
                    }
                  />
                </Route>

                {/* صفحة 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </UserProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AbilityContext.Provider>
  );
};
export default App;
