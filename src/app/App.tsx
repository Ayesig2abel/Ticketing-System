import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./auth/AuthContext";
import { TicketsProvider } from "./data/TicketsContext";
import { SLAProvider } from "./data/SLAContext";
import { ChannelsProvider } from "./data/ChannelsContext";
import { AssetsProvider } from "./data/AssetsContext";
import { KnowledgeBaseProvider } from "./data/KnowledgeBaseContext";


export default function App() {
  return (
    <AuthProvider>
      <TicketsProvider>
        <SLAProvider>
          <ChannelsProvider>
            <AssetsProvider>
              <KnowledgeBaseProvider>
                <RouterProvider router={router} />
              </KnowledgeBaseProvider>
            </AssetsProvider>
          </ChannelsProvider>
        </SLAProvider>
      </TicketsProvider>
    </AuthProvider>
  );
}
