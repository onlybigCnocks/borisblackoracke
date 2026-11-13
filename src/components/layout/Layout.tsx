import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import CryptoCheckoutModal from "@/components/CryptoCheckoutModal";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    <div className="film-grain" />
    <Header />
    <main className="pt-16">{children}</main>
    <Footer />
    <CryptoCheckoutModal />
  </div>
);

export default Layout;
