import { useState, useContext } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/dashboard/Header";
import NavigationTabs from "@/components/dashboard/NavigationTabs";
import ContentTabs from "@/components/dashboard/ContentTabs";
import { Tabs } from "@/components/ui/tabs";
import { AbilityContext } from "@/config/ability";
import DailySalesFooter from "@/components/sales-interface/DailySalesFooter";

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const ability = useContext(AbilityContext);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* الهيدر */}
      <Header
        onLogout={() => console.log("Logout")}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="container mx-auto px-1 py-2 pb-24">
        {/* التابز الخاصة بالتنقل */}
        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ability={ability}
        />

        {/* Tabs + محتوى داخلي */}
        <Tabs value={activeTab} className="mt-6">
          <ContentTabs activeTab={activeTab} />
        </Tabs>
      </main>

      {/* DailySalesFooter */}
      <DailySalesFooter 
        saleTrigger={0}
        returnTrigger={0}
      />
    </div>
  );
};

export default MainLayout;