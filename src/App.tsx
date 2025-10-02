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
import { HashRouter, Routes, Route } from "react-router-dom"; // 🔹 استخدم HashRouter
import { AbilityContext, initialAbility, createAppAbility, AppAbility } from "@/config/ability";
import { useState } from "react";
import ErrorBoundary from "@/components/user_management/ErrorBoundary";
import "./assets/fonts/fonts.css";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "@/pages/LoginPage";
import MainLayout from "@/layouts/MainLayout";
import AuthGuard from "@/pages/AuthGuard";
import { mapBackendPermissions } from "@/config/abilityMapper";

const queryClient = new QueryClient();

const App = () => {
  const savedPermissions = localStorage.getItem("permissions");
  const initialAppAbility: AppAbility = savedPermissions
    ? createAppAbility(mapBackendPermissions(JSON.parse(savedPermissions)))
    : initialAbility;

  const [ability, setAbility] = useState<AppAbility>(initialAppAbility);

  return (
    <AbilityContext.Provider value={ability}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter> {/* 🔹 هنا HashRouter بدل BrowserRouter */}
            <Routes>
              <Route path="/login" element={<Login setAbility={setAbility} />} />
              <Route
                element={
                  <AuthGuard>
                    <ErrorBoundary>
                      <MainLayout />
                    </ErrorBoundary>
                  </AuthGuard>
                }
              >
                <Route path="/" element={<Index />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AbilityContext.Provider>
  );
};

export default App;
