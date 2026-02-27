import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background">
    
    <div className="film-grain" />
    <Header />
    <main className="pt-16">{children}</main>
    <Footer />
  </div>
);

export default Layout;
