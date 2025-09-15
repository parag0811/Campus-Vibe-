'use client';
import { useState, useEffect } from 'react';
import styles from './all-admins.module.css';
import { getOrg } from "@/lib/api.js";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const AdminManagement = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentAdmins, setCurrentAdmins] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState({});
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Fetch organisation and current admins
  useEffect(() => { 
    const fetchOrgAndAdmins = async () => {
      setIsLoadingAdmins(true);
      setError('');
      
      try {
        const orgData = await getOrg();
        if (!orgData.hasOrganisation) {
          setError('No organisation found. Please create an organisation first.');
          setIsLoadingAdmins(false);
          return;
        }
        
        setOrgId(orgData.organisationId);

        // Fetch current admins from backend
        const res = await fetch(
          `${API_BASE}/organisation/${orgData.organisationId}/all-admins`,
          { 
            credentials: "include",
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
        
        const data = await res.json();
        
        if (res.ok && data.admins) {
          // Transform backend data to match frontend expectations
          const transformedAdmins = data.admins.map(admin => ({
            id: admin.user,
            name: admin.userName || "Unknown User",
            email: admin.userEmail || "",
            assignedDate: admin.createdAt || new Date().toISOString(),
            role: "Admin",
            profilePicture: admin.profilePicture || null
          }));
          setCurrentAdmins(transformedAdmins);
        } else {
          setCurrentAdmins([]);
        }
      } catch (err) {
        console.error('Error fetching organisation and admins:', err);
        setError('Failed to load organisation data');
        setCurrentAdmins([]);
      } finally {
        setIsLoadingAdmins(false);
      }
    };
    
    fetchOrgAndAdmins();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim() || !orgId) return;

    setIsSearching(true);
    setSearchPerformed(true);
    setError('');

    try {
      // Search user by email
      const res = await fetch(
        `${API_BASE}/organisation/searchUser?email=${encodeURIComponent(searchEmail.trim())}`,
        { 
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      const data = await res.json();
      
      if (res.ok && data.user) {
        const user = {
          id: data.user._id,
          name: data.user.name || 'Unknown User',
          email: data.user.email,
          profilePicture: data.user.profilePicture || null,
          isCurrentAdmin: currentAdmins.some(admin => admin.id === data.user._id)
        };
        setSearchResults([user]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search user');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignAdmin = async (user) => {
    if (!orgId || !user.id) return;
    
    setIsAssigning(true);
    setError('');
    
    try {
      const res = await fetch(
        `${API_BASE}/organisationAdmin/assign-organisation-admin`,
        {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            userId: user.id, 
            organisationId: orgId 
          })
        }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        // Add new admin to current admins list
        const newAdmin = {
          id: user.id,
          name: user.name,
          email: user.email,
          assignedDate: new Date().toISOString(),
          role: "Admin",
          profilePicture: user.profilePicture
        };
        
        setCurrentAdmins(prev => [...prev, newAdmin]);
        setSearchResults([]);
        setSearchEmail('');
        setSearchPerformed(false);
        setSuccessMessage(`Successfully assigned ${user.name} as admin`);
      } else {
        setError(data.message || 'Failed to assign admin');
      }
    } catch (error) {
      console.error('Assign admin error:', error);
      setError('Failed to assign admin');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAdmin = async (adminId, adminName) => {
    if (!orgId || !adminId) return;
    
    if (!window.confirm(`Are you sure you want to remove ${adminName} as admin?`)) {
      return;
    }

    setIsRemoving(prev => ({ ...prev, [adminId]: true }));
    setError('');

    try {
      const res = await fetch(
        `${API_BASE}/organisationAdmin/remove-organisation-admin`,
        {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
            userId: adminId, 
            organisationId: orgId 
          })
        }
      );
      
      const data = await res.json();
      
      if (res.ok) {
        setCurrentAdmins(prev => prev.filter(admin => admin.id !== adminId));
        setSuccessMessage(`Successfully removed ${adminName} as admin`);
      } else {
        setError(data.message || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Remove admin error:', error);
      setError('Failed to remove admin');
    } finally {
      setIsRemoving(prev => ({ ...prev, [adminId]: false }));
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoadingAdmins) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loadingState}>
            <span className={styles.spinner}></span>
            <span>Loading admin management...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Admin Management</h1>
        
        {/* Error/Success Messages */}
        {error && (
          <div className={styles.errorMessage}>
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')} className={styles.closeButton}>×</button>
          </div>
        )}
        
        {successMessage && (
          <div className={styles.successMessage}>
            <span>✅</span>
            <p>{successMessage}</p>
            <button onClick={() => setSuccessMessage('')} className={styles.closeButton}>×</button>
          </div>
        )}

        {/* Search Section */}
        <div className={styles.searchSection}>
          <h2 className={styles.sectionTitle}>Add New Admin</h2>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchInputGroup}>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search user by email address..."
                className={styles.searchInput}
                required
                disabled={isSearching}
              />
              <button 
                type="submit" 
                disabled={isSearching || !searchEmail.trim()}
                className={styles.searchButton}
              >
                {isSearching ? (
                  <>
                    <span className={styles.spinner}></span>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {searchPerformed && (
            <div className={styles.searchResults}>
              {isSearching ? (
                <div className={styles.loadingState}>
                  <span className={styles.spinner}></span>
                  <span>Searching users...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className={styles.userCards}>
                  {searchResults.map(user => (
                    <div key={user.id} className={styles.userCard}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} />
                          ) : (
                            <span>{user.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.userDetails}>
                          <h3>{user.name}</h3>
                          <p>{user.email}</p>
                          {user.isCurrentAdmin && (
                            <span className={styles.adminBadge}>Already Admin</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignAdmin(user)}
                        disabled={isAssigning || user.isCurrentAdmin}
                        className={`${styles.assignButton} ${user.isCurrentAdmin ? styles.disabled : ''}`}
                      >
                        {isAssigning ? (
                          <>
                            <span className={styles.spinner}></span>
                            <span>Assigning...</span>
                          </>
                        ) : user.isCurrentAdmin ? (
                          'Already Admin'
                        ) : (
                          'Assign Admin'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noResults}>
                  <span>❌</span>
                  <p>No user found with email: <strong>{searchEmail}</strong></p>
                  <small>Please check the email address and try again.</small>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Admins Section */}
        <div className={styles.adminsSection}>
          <h2 className={styles.sectionTitle}>
            Current Admins ({currentAdmins.length})
          </h2>
          
          {currentAdmins.length === 0 ? (
            <div className={styles.emptyState}>
              <span>👥</span>
              <p>No admins assigned yet</p>
              <small>Search for users by email to assign them as admins</small>
            </div>
          ) : (
            <div className={styles.adminsList}>
              {currentAdmins.map(admin => (
                <div key={admin.id} className={styles.adminCard}>
                  <div className={styles.adminInfo}>
                    <div className={styles.adminAvatar}>
                      {admin.profilePicture ? (
                        <img src={admin.profilePicture} alt={admin.name} />
                      ) : (
                        <span>{admin.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.adminDetails}>
                      <h3>{admin.name}</h3>
                      <p className={styles.adminEmail}>{admin.email}</p>
                      <div className={styles.adminMeta}>
                        <span className={styles.role}>{admin.role}</span>
                        <span className={styles.assignedDate}>
                          Assigned: {formatDate(admin.assignedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                    disabled={isRemoving[admin.id]}
                    className={styles.removeButton}
                    title="Remove Admin"
                  >
                    {isRemoving[admin.id] ? (
                      <>
                        <span className={styles.spinner}></span>
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        <span>Remove</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;