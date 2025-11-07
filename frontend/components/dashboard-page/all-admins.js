'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './all-admins.module.css';
import { useToast } from '@/components/common/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const AdminManagement = () => {
  const router = useRouter();
  const { toast } = useToast();

  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentAdmins, setCurrentAdmins] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState({});
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();

    const fetchOrgAndAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        const orgRes = await fetch(`${API_BASE}/org/organisationAdmin/my-organisation`, {
          credentials: 'include',
          signal: ac.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (orgRes.status === 401) {
          toast.info('Please login to manage admins.');
          router.replace('/login');
          return;
        }

        const orgData = await orgRes.json();
        if (!orgRes.ok || !orgData?.hasOrganisation || !(orgData.organisationId || orgData.organisation?._id)) {
          toast.info('Create an organisation first.');
          router.push('/create-organisation');
          return;
        }

        const oid = String(orgData.organisationId || orgData.organisation?._id);
        setOrgId(oid);

        const res = await fetch(`${API_BASE}/org/organisation/${oid}/all-admins`, {
          credentials: 'include',
          signal: ac.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (res.status === 401) {
          toast.info('Please login to manage admins.');
          router.replace('/login');
          return;
        }

        if (res.status === 404) {
          setCurrentAdmins([]);
          return;
        }

        const data = await res.json();
        if (res.ok && Array.isArray(data.admins)) {
          const transformed = data.admins.map((admin) => ({
            id: admin.user,
            name: admin.userName || 'Unknown User',
            email: admin.userEmail || '',
            assignedDate: admin.createdAt || new Date().toISOString(),
            role: 'Admin',
            profileImage: admin.profileImage || null,
          }));
          setCurrentAdmins(transformed);
        } else {
          setCurrentAdmins([]);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          toast.error('Failed to load admins');
          setCurrentAdmins([]);
        }
      } finally {
        if (!ac.signal.aborted) setIsLoadingAdmins(false);
      }
    };

    fetchOrgAndAdmins();
    return () => ac.abort();
  }, [router, toast]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim() || !orgId) return;

    setIsSearching(true);
    setSearchPerformed(true);

    try {
      const res = await fetch(
        `${API_BASE}/org/organisation/searchUser?email=${encodeURIComponent(searchEmail.trim())}`,
        { credentials: 'include', headers: { 'Cache-Control': 'no-cache' } }
      );

      if (res.status === 401) {
        toast.info('Please login to continue.');
        router.replace('/login');
        return;
      }

      const data = await res.json();

      if (res.ok && data.user) {
        const user = {
          id: data.user._id,
          name: data.user.name || 'Unknown User',
          email: data.user.email,
          profileImage: data.user.profileImage || null,
          isCurrentAdmin: currentAdmins.some((a) => a.id === data.user._id),
        };
        setSearchResults([user]);
      } else {
        setSearchResults([]);
      }
    } catch {
      toast.error('Failed to search user');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssignAdmin = async (user) => {
    if (!orgId || !user.id) return;
    setIsAssigning(true);

    try {
      const res = await fetch(`${API_BASE}/org/organisationAdmin/assign-organisation-admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, organisationId: orgId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        toast.info('Please login to continue.');
        router.replace('/login');
        return;
      }
      if (res.status === 409) {
        toast.info(data.message || 'User is already an admin.');
        return;
      }
      if (!res.ok) {
        toast.error(data.message || 'Failed to assign admin');
        return;
      }

      const newAdmin = {
        id: user.id,
        name: user.name,
        email: user.email,
        assignedDate: new Date().toISOString(),
        role: 'Admin',
        profileImage: user.profileImage || null,
      };
      setCurrentAdmins((prev) => [...prev, newAdmin]);
      setSearchResults([]);
      setSearchEmail('');
      setSearchPerformed(false);
      toast.success(data.message || `Assigned ${user.name} as admin`);
    } catch {
      toast.error('Failed to assign admin');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAdmin = async (adminId, adminName) => {
    if (!orgId || !adminId) return;

    if (confirmRemove !== adminId) {
      setConfirmRemove(adminId);
      toast.info(`Click again to remove ${adminName}`);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmRemove(null), 5000);
      return;
    }

    setIsRemoving((prev) => ({ ...prev, [adminId]: true }));

    try {
      const res = await fetch(`${API_BASE}/org/organisationAdmin/remove-organisation-admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminId, organisationId: orgId }),
      });

      const data = await res.json();

      if (res.status === 401) {
        toast.info('Please login to continue.');
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        toast.error(data.message || 'Failed to remove admin');
        return;
      }

      setCurrentAdmins((prev) => prev.filter((a) => a.id !== adminId));
      toast.success(data.message || `Removed ${adminName} as admin`);
    } catch {
      toast.error('Failed to remove admin');
    } finally {
      setIsRemoving((prev) => ({ ...prev, [adminId]: false }));
      setConfirmRemove(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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

          {searchPerformed && (
            <div className={styles.searchResults}>
              {isSearching ? (
                <div className={styles.loadingState}>
                  <span className={styles.spinner}></span>
                  <span>Searching users...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className={styles.userCards}>
                  {searchResults.map((user) => (
                    <div key={user.id} className={styles.userCard}>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.name} />
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
                  <p>
                    No user found with email: <strong>{searchEmail}</strong>
                  </p>
                  <small>Please check the email address and try again.</small>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.adminsSection}>
          <h2 className={styles.sectionTitle}>Current Admins ({currentAdmins.length})</h2>

          {currentAdmins.length === 0 ? (
            <div className={styles.emptyState}>
              <span>👥</span>
              <p>No admins assigned yet</p>
              <small>Search for users by email to assign them as admins</small>
            </div>
          ) : (
            <div className={styles.adminsList}>
              {currentAdmins.map((admin) => (
                <div key={admin.id} className={styles.adminCard}>
                  <div className={styles.adminInfo}>
                    <div className={styles.adminAvatar}>
                      {admin.profileImage ? (
                        <img src={admin.profileImage} alt={admin.name} />
                      ) : (
                        <span>{admin.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.adminDetails}>
                      <h3>{admin.name}</h3>
                      <p className={styles.adminEmail}>{admin.email}</p>
                      <div className={styles.adminMeta}>
                        <span className={styles.role}>{admin.role}</span>
                        <span className={styles.assignedDate}>Assigned: {formatDate(admin.assignedDate)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(admin.id, admin.name)}
                    disabled={isRemoving[admin.id]}
                    className={styles.removeButton}
                    title={confirmRemove === admin.id ? 'Click to confirm' : 'Remove Admin'}
                  >
                    {isRemoving[admin.id] ? (
                      <>
                        <span className={styles.spinner}></span>
                        <span>Removing...</span>
                      </>
                    ) : confirmRemove === admin.id ? (
                      <>
                        <span>⚠️</span>
                        <span>Confirm</span>
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