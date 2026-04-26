import { NavLink } from "react-router-dom";
import { 
  FiHome, FiFileText, FiBookOpen, FiCpu, 
  FiUserCheck, FiUsers, FiLock, FiChevronRight, FiCalendar, FiBook
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion"; 

const Sidebar = ({ isOpen }) => {
  const { stats } = useAuth();
  const level = stats?.level || 1;

  const MENUS = [
    { title: "Home", path: "/", icon: <FiHome />, reqLevel: 1 },
    { title: "Aptitude Arena", path: "/aptitude", icon: <FiBookOpen />, reqLevel: 1 },
    { title: "Technical Hub", path: "/technical", icon: <FiCpu />, reqLevel: 1 },
    { title: "Mock Interview", path: "/interview", icon: <FiUserCheck />, reqLevel: 1 },
    { title: "Live GD Rooms", path: "/gd", icon: <FiUsers />, reqLevel: 1 },
    { title: "Scheduled Tests", path: "/tests",icon: <FiCalendar />, reqLevel: 1 },
    { title: "Resume Parser", path: "/resume-analyzer", icon: <FiFileText />, reqLevel: 1 },
    { title: "Resource Hub", path: "/resources",icon: <FiBook />, reqLevel: 1 },
  ];

  return (
    <div
      className={`h-[calc(100vh-2rem)] fixed left-4 top-4 transition-all duration-500 z-40 
        ${isOpen ? "w-64" : "w-0 opacity-0 pointer-events-none"}`}
    >
      <div className="h-full rounded-3xl flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 bg-[#0d0d0f]/90 backdrop-blur-2xl relative overflow-hidden">
        
        {/* Subtle Inner Glow matching Bento Cards */}
        <div className="absolute inset-0 pointer-events-none" 
             style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.1), transparent 70%)" }} />

        <div className="relative z-10 flex flex-col h-full p-4">
          
          <div className="mb-6 px-4 mt-4">
            <p className="text-[10px] font-black text-[#A855F7] uppercase tracking-[0.25em] font-mono border border-[#A855F7]/30 bg-[#A855F7]/10 px-3 py-1.5 rounded-full inline-block">
              Command Center
            </p>
          </div>

          <nav className="flex-1 space-y-1.5 px-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {MENUS.map((menu, index) => {
              const isLocked = level < menu.reqLevel;

              return (
                <NavLink
                  key={index}
                  to={isLocked ? "#" : menu.path}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                      isLocked 
                        ? "opacity-40 cursor-not-allowed" 
                        : isActive 
                          ? "bg-white/5 border border-white/10 text-white shadow-lg" 
                          : "text-gray-400 border border-transparent hover:bg-white/5 hover:border-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Premium Accent Indicator */}
                      {isActive && !isLocked && (
                        <motion.div 
                          layoutId="activeTabSidebar"
                          className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-gradient-to-b from-[#2DD4BF] to-[#A855F7]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          style={{ boxShadow: "0 0 10px rgba(168,85,247,0.5)" }}
                        />
                      )}

                      <div className={`text-[18px] transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-[#A855F7]" : isLocked ? "text-gray-600" : ""}`}>
                        {isLocked ? <FiLock /> : menu.icon}
                      </div>
                      
                      <span className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-300 ${isLocked ? "text-gray-600" : ""}`}>
                        {menu.title}
                      </span>

                      {isLocked && (
                        <div className="ml-auto bg-[#0d0d0f] text-[#2DD4BF] text-[9px] font-mono font-black px-2 py-0.5 rounded-md border border-[#2DD4BF]/20">
                          LVL {menu.reqLevel}
                        </div>
                      )}

                      {!isLocked && (
                        <FiChevronRight className={`ml-auto text-[14px] text-gray-500 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 ${isActive ? "hidden" : "block"}`} />
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