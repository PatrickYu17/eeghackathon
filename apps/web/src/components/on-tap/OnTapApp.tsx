"use client";

import { useState } from "react";
import { useOnTapApp } from "./hooks/use-on-tap-app";
import { LandingScreen } from "./screens/LandingScreen";
import { BarLoginScreen } from "./screens/BarLoginScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { CreateAccountScreen } from "./screens/CreateAccountScreen";
import { ManagerLoginScreen } from "./screens/ManagerLoginScreen";
import { StaffLoginScreen } from "./screens/StaffLoginScreen";
import { TellUsWhatYouHave } from "./screens/TellUsWhatYouHave";
import { FullStockPage } from "./screens/FullStockPage";
import { AddStaffPage } from "./screens/AddStaffPage";
import { BartenderDashboard } from "./components/BartenderDashboard";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SpiritsModal } from "./components/SpiritsModal";
import { MixersModal } from "./components/MixersModal";
import { WineModal } from "./components/WineModal";
import { BeerModal } from "./components/BeerModal";
import { GenericCategoryModal } from "./components/GenericCategoryModal";
import { EndOfNightModal } from "./components/EndOfNightModal";
import type { SelectedItem } from "./hooks/use-on-tap-app";
import type { ManagerNightSummary } from "../../lib/on-tap-types";
import type { CustomCategory } from "./screens/TellUsWhatYouHave";

export function OnTapApp() {
  const app = useOnTapApp();

  /* ─── Modal state ─── */
  const [activeModal, setActiveModal] = useState<"spirits" | "mixers" | "wine" | "beer" | null>(null);
  const [activeCustomModal, setActiveCustomModal] = useState<{ id: string; label: string } | null>(null);

  /* ─── Onboarding collected data ─── */
  const [onboardingStock, setOnboardingStock] = useState<Record<string, SelectedItem[]>>({});
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  /* ─── End-of-night summary modal ─── */
  const [endOfNightModalNight, setEndOfNightModalNight] = useState<ManagerNightSummary | null>(null);

  /* ─── Helper: open modal for category ─── */
  const openModal = (cat: "spirits" | "mixers" | "wine" | "beer") => {
    app.setOnboardingCategories((prev) =>
      prev.includes(cat) ? prev : [...prev, cat]
    );
    setActiveModal(cat);
  };

  /* ─── Helper: save built-in modal items ─── */
  const saveModalItems = (items: SelectedItem[]) => {
    if (!activeModal) return;
    app.setOnboardingItems((prev) => ({ ...prev, [activeModal]: items }));
    setActiveModal(null);
  };

  /* ─── Helper: save custom modal items ─── */
  const saveCustomModalItems = (items: SelectedItem[]) => {
    if (!activeCustomModal) return;
    app.setOnboardingItems((prev) => ({ ...prev, [activeCustomModal.id]: items }));
    setActiveCustomModal(null);
  };

  /* ─── FullStockPage onNext ─── */
  const handleStockNext = (stock: Record<string, SelectedItem[]>) => {
    // Merge modal items with FullStockPage items for built-ins
    const merged: Record<string, SelectedItem[]> = {};
    for (const cat of ["spirits", "beer", "wine", "mixers"]) {
      const fromModal = app.onboardingItems[cat] || [];
      const fromPage = stock[cat] || [];
      merged[cat] = fromPage.length > 0 ? fromPage : fromModal;
    }
    // Include custom categories
    for (const cat of customCategories) {
      merged[cat.id] = stock[cat.id] || [];
    }
    setOnboardingStock(merged);
    app.setView("onboarding-staff");
  };

  /* ─── AddStaffPage onDone ─── */
  const handleStaffDone = async (staff: { name: string }[]) => {
    if (savingOnboarding) return;
    const names = staff.map((s) => s.name);
    // Also include beer items if not already collected
    const allStock = { ...onboardingStock };
    if (app.onboardingCategories.includes("beer") && !allStock["beer"]) {
      allStock["beer"] = [
        { id: "stella", label: "Stella Artois", qty: 48 },
        { id: "heineken", label: "Heineken", qty: 24 },
        { id: "corona", label: "Corona", qty: 12 },
      ];
    }
    // Build category name map for custom categories
    const categoryNames: Record<string, string> = {};
    for (const cat of customCategories) {
      categoryNames[cat.id] = cat.label;
    }
    setSavingOnboarding(true);
    try {
      const ok = await app.handleSaveOnboarding(allStock, names, categoryNames);
      if (!ok) {
        /* error is shown via app.error */
      }
    } finally {
      setSavingOnboarding(false);
    }
  };

  /* ─── LANDING ─── */
  if (app.view === "landing") {
    return (
      <LandingScreen
        onGetStarted={() => app.setView("create")}
        onHaveAccount={() => app.setView("bar-login")}
      />
    );
  }

  /* ─── BAR LOGIN ─── */
  if (app.view === "bar-login") {
    return (
      <BarLoginScreen
        onBack={() => app.setView("landing")}
        onSuccess={app.handleBarLogin}
      />
    );
  }

  /* ─── WELCOME ─── */
  if (app.view === "welcome") {
    return (
      <WelcomeScreen
        barName={app.barAccount?.name}
        onStaffLogin={() => app.setView("staff-login")}
        onManagerLogin={() => app.setView("manager-login")}
        onGetStarted={() => app.setView("create")}
        onChangeBar={app.handleClearBarContext}
      />
    );
  }

  /* ─── CREATE ACCOUNT ─── */
  if (app.view === "create") {
    return (
      <CreateAccountScreen
        onBack={() => app.setView("landing")}
        onSubmit={app.handleCreateAccount}
        onSignIn={() => app.setView("bar-login")}
      />
    );
  }

  /* ─── MANAGER LOGIN ─── */
  if (app.view === "manager-login") {
    return (
      <ManagerLoginScreen
        onBack={() => app.setView("welcome")}
        onLogin={app.handleManagerLogin}
        onSuccess={() => app.setView("manager")}
        onForgotCode={() => app.setError("Password reset not yet implemented")}
      />
    );
  }

  /* ─── STAFF LOGIN ─── */
  if (app.view === "staff-login") {
    return (
      <StaffLoginScreen
        onBack={() => app.setView("welcome")}
        barName={app.barAccount?.name}
        onStartShift={app.handleStaffLogin}
        onSuccess={() => app.setView("bartender")}
      />
    );
  }

  /* ─── ONBOARDING: CATEGORIES ─── */
  if (app.view === "onboarding-cats") {
    return (
      <>
        <TellUsWhatYouHave
          onBack={() => app.setView("create")}
          onNext={(selected) => {
            app.setOnboardingCategories(selected);
            app.setView("onboarding-stock");
          }}
          onOpenModal={openModal}
          selectedCategories={app.onboardingCategories}
          customCategories={customCategories}
          onAddCustomCategory={(cat) => setCustomCategories((prev) => [...prev, cat])}
          onRemoveCustomCategory={(id) =>
            setCustomCategories((prev) => prev.filter((c) => c.id !== id))
          }
          onOpenCustomModal={(id, label) => {
            app.setOnboardingCategories((prev) =>
              prev.includes(id) ? prev : [...prev, id]
            );
            setActiveCustomModal({ id, label });
          }}
        />

        {activeModal === "spirits" && (
          <SpiritsModal
            onConfirm={saveModalItems}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "mixers" && (
          <MixersModal
            onConfirm={saveModalItems}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "wine" && (
          <WineModal
            onConfirm={saveModalItems}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "beer" && (
          <BeerModal
            onConfirm={saveModalItems}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeCustomModal && (
          <GenericCategoryModal
            categoryName={activeCustomModal.label}
            initialItems={app.onboardingItems[activeCustomModal.id]}
            onConfirm={saveCustomModalItems}
            onClose={() => setActiveCustomModal(null)}
          />
        )}
      </>
    );
  }

  /* ─── ONBOARDING: STOCK ─── */
  if (app.view === "onboarding-stock") {
    return (
      <FullStockPage
        onBack={() => app.setView("onboarding-cats")}
        onNext={handleStockNext}
        initialItems={app.onboardingItems}
        selectedCategories={app.onboardingCategories}
        customCategories={customCategories}
      />
    );
  }

  /* ─── ONBOARDING: STAFF ─── */
  if (app.view === "onboarding-staff") {
    return (
      <AddStaffPage
        onBack={() => app.setView("onboarding-stock")}
        onDone={handleStaffDone}
        error={app.error}
        loading={savingOnboarding}
      />
    );
  }

  /* ─── BARTENDER DASHBOARD ─── */
  if (app.view === "bartender") {
    return (
      <BartenderDashboard
        staffName={app.session?.name || "Bartender"}
        data={app.bartenderData}
        totalBottles={app.totalBottles}
        loading={app.bartenderLoading}
        onClockOut={app.handleClockOut}
        onBottleDone={app.handleBottleDone}
        onRestockCategory={app.handleRestockCategory}
        onUndo={app.handleUndoBottle}
        onReload={app.loadBartenderDashboard}
      />
    );
  }

  /* ─── MANAGER DASHBOARD ─── */
  if (app.view === "manager") {
    const handleCloseNight = async () => {
      const result = await app.handleCloseNight();
      if (result.success && result.nightId) {
        const night = app.previousNights.find((n) => n.id === result.nightId);
        if (night) setEndOfNightModalNight(night);
      }
      return result.success;
    };

    return (
      <>
        <ManagerDashboard
          nights={app.previousNights}
          categories={app.managerData?.categories ?? []}
          selectedNightId={app.selectedNightId}
          currentNightId={app.managerData?.barNight.id ?? null}
          onSelectNight={(id) => app.setSelectedNightId(id)}
          onSettings={() => app.setView("settings")}
          onCloseNight={handleCloseNight}
          onExport={app.handleExportNight}
          onRestockCategory={app.handleRestockCategory}
          onStaffMode={() => app.setView("staff-login")}
          loading={app.managerLoading}
          barName={app.barAccount?.name || "Your Bar"}
        />
        {endOfNightModalNight && (
          <EndOfNightModal
            nightId={endOfNightModalNight.id}
            nightDate={`${endOfNightModalNight.date} · ${endOfNightModalNight.day}`}
            bottlesUsed={endOfNightModalNight.bottlesUsed}
            alertsFlagged={endOfNightModalNight.alertsFlagged}
            bartendersOn={endOfNightModalNight.bartendersOn}
            onClose={() => setEndOfNightModalNight(null)}
          />
        )}
      </>
    );
  }

  /* ─── SETTINGS ─── */
  if (app.view === "settings") {
    return (
      <SettingsScreen
        onBack={() => app.setView("manager")}
        onLogOut={app.handleLogout}
        barName={app.barAccount?.name || "Your Bar"}
        settingsData={app.settingsData}
      />
    );
  }

  /* Fallback */
  return (
    <LandingScreen
      onGetStarted={() => app.setView("create")}
      onHaveAccount={() => app.setView("bar-login")}
    />
  );
}
