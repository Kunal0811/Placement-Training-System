import { NavLink } from "react-router-dom";
import { 
  FiHome, FiFileText, FiBookOpen, FiCpu, 
  FiUserCheck, FiUsers, FiLock, FiChevronRight, FiBook
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion"; // Ensure you ran 'npm install framer-motion'

const Sidebar = ({ isOpen }) => {
  const { stats } = useAuth();
  const level = stats?.level || 1;

  const MENUS = [
    { title: "Home", path: "/", icon: <FiHome />, reqLevel: 1 },
    { title: "Aptitude Hub", path: "/aptitude", icon: <FiBookOpen />, reqLevel: 1 },
    { title: "Technical Hub", path: "/technical", icon: <FiCpu />, reqLevel: 1 },
    { title: "Mock Interview", path: "/interview", icon: <FiUserCheck />, reqLevel: 1 },
    { title: "Group Discussion", path: "/gd", icon: <FiUsers />, reqLevel: 1 },
    { title: "Scheduled Tests", path: "/tests",icon: "📃" },
    { title: "Resource Library", path: "/resources",icon: "📃" },
    { title: "Resume AI", path: "/resume-analyzer", icon: <FiFileText />, reqLevel: 1 },
  ];

  const sidebarBg = "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1000&auto=format&fit=crop";

  return (
    <div
      className={`h-[calc(100vh-2rem)] fixed left-2 top-4 transition-all duration-500 z-40 
        ${isOpen ? "w-64" : "w-0 opacity-0 pointer-events-none"}`}
    >
      <div 
        className="h-full rounded-[2rem] flex flex-col shadow-2xl border border-white/10 relative overflow-hidden bg-slate-950"
        style={{ 
          backgroundImage: `url(${sidebarBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] -z-0" />

        <div className="relative z-10 flex flex-col h-full p-4">
          
          <div className="mb-8 px-4 mt-6">
            {/* Fixed the font size here from 20px to 10px to fit the tracking */}
            <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.4em]">
              Learning Path
            </p>
          </div>

          <nav className="flex-1 space-y-2 px-2">
            {MENUS.map((menu, index) => {
              const isLocked = level < menu.reqLevel;

              return (
                <NavLink
                  key={index}
                  to={isLocked ? "#" : menu.path}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                      isLocked 
                        ? "opacity-40 cursor-not-allowed" 
                        : isActive 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Using motion.div for the active indicator */}
                      {isActive && !isLocked && (
                        <motion.div 
                          layoutId="activeTabSidebar"
                          className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      <div className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isLocked ? "text-slate-500" : ""}`}>
                        {isLocked ? <FiLock /> : menu.icon}
                      </div>
                      
                      <span className={`text-sm font-bold tracking-tight whitespace-nowrap transition-colors duration-300 ${
                        isLocked ? "text-slate-500" : ""
                      }`}>
                        {menu.title}
                      </span>

                      {isLocked && (
                        <div className="ml-auto bg-slate-900/80 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-white/5">
                          LVL {menu.reqLevel}
                        </div>
                      )}

                      {!isLocked && (
                        <FiChevronRight className={`ml-auto opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 ${isActive ? "hidden" : "block"}`} />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          
        </div>
      </div>
    </div>
  );
};

export default Sidebar;