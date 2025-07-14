// Comprehensive Project Lifecycle Logger
// Tracks every project operation to identify where data loss occurs

interface ProjectLogEntry {
  timestamp: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SAVE' | 'LOAD' | 'STATE_CHANGE' | 'AUTO_SAVE' | 'AUTH_CHANGE' | 'ERROR';
  location: string;
  userId?: string;
  projectCount: number;
  projects: Array<{ id: string; name: string }>;
  operation: string;
  details?: any;
  stackTrace?: string;
}

class ProjectLogger {
  private logs: ProjectLogEntry[] = [];
  private maxLogs = 500; // Keep last 500 entries
  
  private getCurrentProjects(): Array<{ id: string; name: string }> {
    try {
      const { useSettlementStore } = require('../state/useSettlementStore');
      const settlement = useSettlementStore.getState().settlement;
      
      // Handle both array and object formats for projects
      const projects = settlement?.projects;
      let projectsArray: any[] = [];
      
      if (Array.isArray(projects)) {
        projectsArray = projects;
      } else if (projects && typeof projects === 'object') {
        projectsArray = Object.values(projects);
      }
      
      return projectsArray.map((p: any) => ({ id: p.id, name: p.name })) || [];
    } catch {
      return [];
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      const { auth } = require('../firebase/config');
      return auth.currentUser?.uid;
    } catch {
      return undefined;
    }
  }

  private addLog(entry: Omit<ProjectLogEntry, 'timestamp' | 'projectCount' | 'projects'>) {
    const currentProjects = this.getCurrentProjects();
    
    const logEntry: ProjectLogEntry = {
      timestamp: new Date().toISOString(),
      projectCount: currentProjects.length,
      projects: currentProjects,
      userId: this.getCurrentUserId(),
      stackTrace: new Error().stack,
      ...entry
    };

    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Always log to console with distinctive formatting
    console.log(
      `%c🔍 PROJECT LOG [${entry.type}] ${entry.location}`,
      'background: #1e40af; color: white; padding: 2px 6px; border-radius: 3px;',
      {
        operation: entry.operation,
        projectCount: logEntry.projectCount,
        projects: logEntry.projects.map(p => p.name),
        details: entry.details,
        userId: logEntry.userId,
        timestamp: logEntry.timestamp
      }
    );

    // Detect project loss
    if (entry.type === 'LOAD' || entry.type === 'STATE_CHANGE') {
      this.detectProjectLoss(logEntry);
    }
  }

  private detectProjectLoss(currentEntry: ProjectLogEntry) {
    // Find the most recent entry that had projects
    const lastEntryWithProjects = [...this.logs].reverse().find(
      log => log.projectCount > 0 && log.timestamp < currentEntry.timestamp
    );

    if (lastEntryWithProjects && currentEntry.projectCount === 0 && lastEntryWithProjects.projectCount > 0) {
      const lostProjects = lastEntryWithProjects.projects;
      
      console.error(
        `%c🚨 PROJECT LOSS DETECTED!`,
        'background: #dc2626; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
        {
          lostProjects: lostProjects.map(p => p.name),
          lostCount: lostProjects.length,
          lastSeenAt: lastEntryWithProjects.timestamp,
          lastSeenLocation: lastEntryWithProjects.location,
          lostAt: currentEntry.timestamp,
          lostAtLocation: currentEntry.location,
          timeDifference: new Date(currentEntry.timestamp).getTime() - new Date(lastEntryWithProjects.timestamp).getTime(),
          recentOperations: this.logs.slice(-10).map(log => ({
            time: log.timestamp,
            type: log.type,
            location: log.location,
            operation: log.operation,
            projectCount: log.projectCount
          }))
        }
      );

      // Store critical loss event
      this.addLog({
        type: 'ERROR',
        location: 'ProjectLogger.detectProjectLoss',
        operation: `PROJECT_LOSS_DETECTED: ${lostProjects.length} projects lost`,
        details: {
          lostProjects,
          lastSeen: lastEntryWithProjects,
          lostAt: currentEntry
        }
      });
    }
  }

  // Public logging methods
  logProjectCreate(location: string, projectData: any) {
    this.addLog({
      type: 'CREATE',
      location,
      operation: `Created project: ${projectData.name}`,
      details: { projectData }
    });
  }

  logProjectUpdate(location: string, projectId: string, updates: any) {
    this.addLog({
      type: 'UPDATE',
      location,
      operation: `Updated project: ${projectId}`,
      details: { projectId, updates }
    });
  }

  logProjectDelete(location: string, projectId: string, projectName?: string) {
    this.addLog({
      type: 'DELETE',
      location,
      operation: `Deleted project: ${projectName || projectId}`,
      details: { projectId, projectName }
    });
  }

  logDataSave(location: string, operation: string, settlementData: any) {
    // Handle both array and object formats for projects
    const projects = settlementData?.projects;
    let projectsArray: any[] = [];
    
    if (Array.isArray(projects)) {
      projectsArray = projects;
    } else if (projects && typeof projects === 'object') {
      projectsArray = Object.values(projects);
    }
    
    this.addLog({
      type: 'SAVE',
      location,
      operation,
      details: {
        settlementProjects: projectsArray.length || 0,
        settlementProjectNames: projectsArray.map((p: any) => p.name || p.id || 'Unknown') || [],
        hasSettlement: !!settlementData,
        settlementKeys: settlementData ? Object.keys(settlementData) : []
      }
    });
  }

  logDataLoad(location: string, operation: string, loadedData: any) {
    // Handle both array and object formats for projects
    const projects = loadedData?.settlement?.projects;
    let projectsArray: any[] = [];
    
    if (Array.isArray(projects)) {
      projectsArray = projects;
    } else if (projects && typeof projects === 'object') {
      projectsArray = Object.values(projects);
    }
    
    this.addLog({
      type: 'LOAD',
      location,
      operation,
      details: {
        hasData: !!loadedData,
        hasSettlement: !!loadedData?.settlement,
        loadedProjects: projectsArray.length || 0,
        loadedProjectNames: projectsArray.map((p: any) => p.name || p.id || 'Unknown') || [],
        dataKeys: loadedData ? Object.keys(loadedData) : [],
        settlementKeys: loadedData?.settlement ? Object.keys(loadedData.settlement) : []
      }
    });
  }

  logStateChange(location: string, operation: string, newState: any) {
    // Handle both array and object formats for projects
    const projects = newState?.projects;
    let projectsArray: any[] = [];
    
    if (Array.isArray(projects)) {
      projectsArray = projects;
    } else if (projects && typeof projects === 'object') {
      projectsArray = Object.values(projects);
    }
    
    this.addLog({
      type: 'STATE_CHANGE',
      location,
      operation,
      details: {
        hasSettlement: !!newState,
        stateProjects: projectsArray.length || 0,
        stateProjectNames: projectsArray.map((p: any) => p.name || p.id || 'Unknown') || [],
        stateKeys: newState ? Object.keys(newState) : []
      }
    });
  }

  logAutoSave(location: string, operation: string, reason: string, data?: any) {
    this.addLog({
      type: 'AUTO_SAVE',
      location,
      operation: `${operation} - ${reason}`,
      details: {
        reason,
        dataIncluded: !!data,
        dataType: typeof data,
        ...data
      }
    });
  }

  logAuthChange(location: string, operation: string, authState: any) {
    this.addLog({
      type: 'AUTH_CHANGE',
      location,
      operation,
      details: {
        hasUser: !!authState,
        userEmail: authState?.email,
        userId: authState?.uid
      }
    });
  }

  logError(location: string, error: string, details?: any) {
    this.addLog({
      type: 'ERROR',
      location,
      operation: `ERROR: ${error}`,
      details
    });
  }

  // Get logs for debugging
  getLogs(): ProjectLogEntry[] {
    return [...this.logs];
  }

  getRecentLogs(count = 20): ProjectLogEntry[] {
    return this.logs.slice(-count);
  }

  getLogsByType(type: ProjectLogEntry['type']): ProjectLogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  // Get logs as formatted text for export
  getLogsAsText(): string {
    return this.logs.map(log => 
      `[${log.timestamp}] ${log.type} @ ${log.location}: ${log.operation} (Projects: ${log.projectCount}) ${JSON.stringify(log.details || {})}`
    ).join('\n');
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.log('🔍 Project logs cleared');
  }

  // Export logs for analysis
  exportLogs() {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📁 Project logs exported');
  }
}

// Create singleton instance
export const projectLogger = new ProjectLogger();

// Make it globally available for debugging
(window as any).__projectLogger = projectLogger;

console.log('🔍 Project Logger initialized - Access via window.__projectLogger'); 