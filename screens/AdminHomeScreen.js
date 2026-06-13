import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { logoutUser } from '../services/auth';
import { getPrimaryImageUrl } from '../utils/apartmentImages';
import { openWhatsAppForPhone } from '../utils/whatsapp';
import { APARTMENT_SELECT_FULL, USER_PROFILE_SELECT_FULL, formatPrice, getProfileVerificationLabel } from '../utils/marketplace';
import { setProfileVerification } from '../services/messages';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'apartments', label: 'Apartments' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'users', label: 'Users' },
];

const ROLES = ['client', 'owner', 'admin'];

// AdminHomeScreen eshte panel kontrolli per apartamente, bookings dhe perdorues.
export default function AdminHomeScreen({ navigation }) {
  // State-et ruajne tab-in aktiv, te dhenat e panelit, search dhe gjendjet loading/logout.
  const [activeTab, setActiveTab] = useState('overview');
  const [apartments, setApartments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Ngarkon te gjitha te dhenat qe i duhen adminit dhe verifikon rolin admin.
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (authError || !userId) {
        Alert.alert('Error', 'You must be logged in as an admin.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      setCurrentAdminId(userId);

      // Select-e alternative qe paneli te punoje edhe kur disa kolona mungojne.
      const userSelectOptions = USER_PROFILE_SELECT_FULL;

      let usersData = [];

      for (const selectFields of userSelectOptions) {
        const { data, error } = await supabase
          .from('users')
          .select(selectFields)
          .order('email', { ascending: true });

        if (error?.code === '42703') {
          continue;
        }

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        usersData = data || [];
        break;
      }

      // Vetem user-at me role admin lejohen te qendrojne ne panel.
      const profile = usersData.find((user) => user.id === userId);

      if (profile?.role !== 'admin') {
        Alert.alert('Error', 'You do not have access to the admin panel.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const apartmentSelectOptions = APARTMENT_SELECT_FULL;

      let apartmentData = [];
      let apartmentError = null;

      for (const selectFields of apartmentSelectOptions) {
        const result = await supabase
          .from('apartments')
          .select(selectFields)
          .order('id', { ascending: false });

        if (result.error?.code === '42703') {
          continue;
        }

        apartmentData = result.data || [];
        apartmentError = result.error;
        break;
      }

      if (apartmentError) {
        Alert.alert('Error', apartmentError.message);
        return;
      }

      // Booking-et merren me disa forma select-i per kompatibilitet me skemen.
      const bookingSelectOptions = [
        'id, start_date, end_date, status, user_id, owner_id, apartment_id, guest_first_name, guest_last_name, guest_phone',
        'id, start_date, end_date, status, user_id, owner_id, apartment_id',
        'id, start_date, end_date, user_id, owner_id, apartment_id',
        'id, start_date, end_date, user_id, apartment_id',
      ];

      let bookingData = [];

      for (const selectFields of bookingSelectOptions) {
        const { data, error } = await supabase
          .from('bookings')
          .select(selectFields)
          .order('start_date', { ascending: false });

        if (error?.code === '42703') {
          continue;
        }

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        bookingData = data || [];
        break;
      }

      // Map-at lidhen booking-et dhe apartamentet me user-at pa bere query shtese ne render.
      const userMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      const apartmentMap = (apartmentData || []).reduce((acc, apartment) => {
        acc[apartment.id] = apartment;
        return acc;
      }, {});

      setUsers(usersData);
      setApartments(
        (apartmentData || []).map((apartment) => ({
          ...apartment,
          owner: userMap[apartment.owner_id] || null,
        }))
      );
      setBookings(
        (bookingData || []).map((booking) => ({
          ...booking,
          apartment: apartmentMap[booking.apartment_id] || null,
          apartment_id: booking.apartment_id || apartmentMap[booking.apartment_id]?.id,
          owner_id: booking.owner_id || apartmentMap[booking.apartment_id]?.owner_id,
          guest: userMap[booking.user_id] || null,
          owner: userMap[booking.owner_id || apartmentMap[booking.apartment_id]?.owner_id] || null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [loadAdminData])
  );

  // Kthen emrin e plote, email-in ose fallback per shfaqje ne UI.
  const getUserName = (user, fallback = 'Unknown user') => {
    if (!user) {
      return fallback;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName || user.email || fallback;
  };

  const getBookingGuestName = (booking) => {
    const bookingName = [booking.guest_first_name, booking.guest_last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return bookingName || getUserName(booking.guest, 'Unknown guest');
  };

  // Statistika per qytete: sa apartamente dhe booking-e ka secili qytet.
  const cityStats = useMemo(() => {
    const cityMap = apartments.reduce((acc, apartment) => {
      const city = apartment.city || 'No city';

      if (!acc[city]) {
        acc[city] = {
          id: city,
          city,
          apartments: 0,
          bookings: 0,
          totalRent: 0,
        };
      }

      acc[city].apartments += 1;
      acc[city].totalRent += Number(apartment.price) || 0;
      return acc;
    }, {});

    bookings.forEach((booking) => {
      const city = booking.apartment?.city || 'No city';

      if (!cityMap[city]) {
        cityMap[city] = {
          id: city,
          city,
          apartments: 0,
          bookings: 0,
          totalRent: 0,
        };
      }

      cityMap[city].bookings += 1;
    });

    return Object.values(cityMap).sort((first, second) => second.bookings - first.bookings);
  }, [apartments, bookings]);

  // Statistika te pergjithshme per kartat e overview.
  const stats = useMemo(() => {
    const owners = users.filter((user) => user.role === 'owner').length;
    const clients = users.filter((user) => user.role === 'client').length;
    const admins = users.filter((user) => user.role === 'admin').length;
    const monthlyRent = apartments.reduce((sum, apartment) => sum + (Number(apartment.price) || 0), 0);

    return { owners, clients, admins, monthlyRent };
  }, [apartments, users]);

  // Filtron te dhenat sipas tab-it aktiv dhe tekstit te kerkimit.
  const filteredData = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = (values) => values.filter(Boolean).join(' ').toLowerCase().includes(needle);

    if (activeTab === 'overview') {
      return cityStats.filter((item) => !needle || matches([item.city]));
    }

    if (activeTab === 'apartments') {
      return apartments.filter((item) =>
        !needle || matches([item.title, item.city, item.description, getUserName(item.owner)])
      );
    }

    if (activeTab === 'bookings') {
      return bookings.filter((item) =>
        !needle ||
        matches([
          item.apartment?.title,
          item.apartment?.city,
          getBookingGuestName(item),
          getUserName(item.owner),
          item.start_date,
          item.end_date,
        ])
      );
    }

    return users.filter((item) =>
      !needle || matches([item.email, item.first_name, item.last_name, item.phone, item.role])
    );
  }, [activeTab, apartments, bookings, cityStats, search, users]);

  // Hap/mbyll detajet e nje karte ne liste.
  const toggleExpanded = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  // Nderrimi i tab-it pastron kartat e hapura.
  const switchTab = (tab) => {
    setActiveTab(tab);
    setExpandedId(null);
  };

  // Mbyll sesionin e adminit dhe kthehet te Login.
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            const { error } = await logoutUser();

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  // Fshin apartamentin nga Supabase pas konfirmimit.
  const handleDeleteApartment = (apartmentId) => {
    Alert.alert('Delete', 'Are you sure you want to delete this apartment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('apartments').delete().eq('id', apartmentId);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          loadAdminData();
        },
      },
    ]);
  };

  // Fshin nje booking nga paneli i adminit.
  const handleDeleteBooking = (bookingId) => {
    Alert.alert('Delete', 'Are you sure you want to delete this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          loadAdminData();
        },
      },
    ]);
  };

  // Ndryshon rolin e user-it, por mbron adminin aktual nga heqja e rolit te vet.
  const handleChangeRole = (user, role) => {
    if (user.id === currentAdminId && role !== 'admin') {
      Alert.alert('Error', 'You cannot remove the admin role from your own account.');
      return;
    }

    Alert.alert('Change role', `Change ${getUserName(user)} to ${role}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          const { error } = await supabase.from('users').update({ role }).eq('id', user.id);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          loadAdminData();
        },
      },
    ]);
  };

  // Verifikon ose heq verifikimin e profilit te user-it.
  const handleVerification = async (user, verified) => {
    const { error } = await setProfileVerification({ userId: user.id, verified });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    loadAdminData();
  };

  // Renderon statistikat per nje qytet ne tab-in Overview.
  const renderOverviewItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.86}
      onPress={() => toggleExpanded(`city-${item.city}`)}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardTitle}>{item.city}</Text>
          <Text style={styles.cardCity}>{item.apartments} active apartments</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>{item.bookings} bookings</Text>
        </View>
      </View>
      <Text style={styles.metaText}>Total monthly rent: {formatPrice(item.totalRent)}</Text>
      {expandedId === `city-${item.city}` ? (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailLine}>Average rent: {formatPrice(item.apartments ? Math.round(item.totalRent / item.apartments) : 0)}</Text>
          <Text style={styles.detailLine}>Booking share: {bookings.length ? Math.round((item.bookings / bookings.length) * 100) : 0}%</Text>
          <TouchableOpacity
            style={styles.secondaryButtonFull}
            onPress={() => {
              setSearch(item.city);
              switchTab('apartments');
            }}
          >
            <Text style={styles.secondaryButtonText}>Open city apartments</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.openHint}>Tap for more</Text>
      )}
    </TouchableOpacity>
  );

  // Renderon nje apartament ne panel me veprime Open/Edit/Delete.
  const renderApartment = ({ item }) => {
    const imageUrl = getPrimaryImageUrl(item.image_url);
    const isExpanded = expandedId === `apartment-${item.id}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => toggleExpanded(`apartment-${item.id}`)}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.cardImage} /> : null}
        <View style={styles.cardTop}>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{item.title || 'No title'}</Text>
            <Text style={styles.cardCity}>{item.city || 'No city'}</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formatPrice(item.price, item.currency)}</Text>
          </View>
        </View>
        <Text style={styles.metaText}>
          Owner: {item.owner_name || getUserName(item.owner, item.owner_id || 'Unknown owner')}
        </Text>
        <Text style={styles.metaText}>{item.rooms || 0} rooms | Per month</Text>
        {isExpanded ? (
          <View style={styles.detailsPanel}>
            <Text style={styles.cardDesc}>{item.description || 'No description.'}</Text>
            <Text style={styles.detailLine}>Owner phone: {item.owner_phone || item.owner?.phone || 'No phone number'}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('ApartmentDetail', { apartment: item, viewerRole: 'admin' })}
              >
                <Text style={styles.secondaryButtonText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('AddApartment', { apartment: item })}
              >
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteApartment(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.openHint}>Tap for details</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Renderon nje booking dhe shfaq detaje per klientin/pronarin.
  const renderBooking = ({ item }) => {
    const guestPhone = item.guest_phone || item.guest?.phone;
    const isExpanded = expandedId === `booking-${item.id}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => toggleExpanded(`booking-${item.id}`)}
      >
        <Text style={styles.cardTitle}>{item.apartment?.title || 'Unknown Apartment'}</Text>
        <Text style={styles.cardCity}>{item.apartment?.city || 'Unknown city'}</Text>
        <View style={styles.row}>
          <Text style={styles.metaLabel}>From</Text>
          <Text style={styles.metaValue}>{item.start_date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.metaLabel}>To</Text>
          <Text style={styles.metaValue}>{item.end_date}</Text>
        </View>
        <Text style={styles.metaText}>Guest: {getBookingGuestName(item)}</Text>
        <Text style={styles.metaText}>Status: {item.status || 'pending'}</Text>
        {isExpanded ? (
          <View style={styles.detailsPanel}>
            <Text style={styles.detailLine}>Owner: {getUserName(item.owner, item.owner_id || 'Unknown owner')}</Text>
            <TouchableOpacity
              style={styles.secondaryButtonFull}
              onPress={() => openWhatsAppForPhone(guestPhone)}
              disabled={!guestPhone}
            >
              <Text style={[styles.secondaryButtonText, !guestPhone && styles.disabledText]}>
                WhatsApp: {guestPhone || 'No phone number'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fullDeleteButton} onPress={() => handleDeleteBooking(item.id)}>
              <Text style={styles.deleteButtonText}>Delete booking</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.openHint}>Tap for details</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Renderon nje user me role, verifikim dhe statistika.
  const renderUser = ({ item }) => {
    const isExpanded = expandedId === `user-${item.id}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => toggleExpanded(`user-${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{getUserName(item)}</Text>
            <Text style={styles.cardCity}>{item.email || item.id}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{item.role || 'client'}</Text>
          </View>
        </View>
        {isExpanded ? (
          <View style={styles.detailsPanel}>
            <Text style={styles.detailLine}>Phone: {item.phone || 'No phone number'}</Text>
            <Text style={styles.detailLine}>Verification: {getProfileVerificationLabel(item)}</Text>
            <Text style={styles.detailLine}>
              Apartments: {apartments.filter((apartment) => apartment.owner_id === item.id).length}
            </Text>
            <Text style={styles.detailLine}>
              Bookings: {bookings.filter((booking) => booking.user_id === item.id).length}
            </Text>
            <View style={styles.roleActions}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleButton, item.role === role && styles.roleButtonActive]}
                  onPress={() => handleChangeRole(item, role)}
                >
                  <Text style={[styles.roleButtonText, item.role === role && styles.roleButtonTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.roleActions}>
              <TouchableOpacity
                style={[styles.roleButton, item.verified && styles.roleButtonActive]}
                onPress={() => handleVerification(item, true)}
              >
                <Text style={[styles.roleButtonText, item.verified && styles.roleButtonTextActive]}>
                  verify
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, !item.verified && styles.roleButtonActive]}
                onPress={() => handleVerification(item, false)}
              >
                <Text style={[styles.roleButtonText, !item.verified && styles.roleButtonTextActive]}>
                  reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.openHint}>Tap for roles and stats</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Zgjedh renderer-in e duhur sipas tab-it aktiv.
  const renderItem = (props) => {
    if (activeTab === 'overview') {
      return renderOverviewItem(props);
    }

    if (activeTab === 'apartments') {
      return renderApartment(props);
    }

    if (activeTab === 'bookings') {
      return renderBooking(props);
    }

    return renderUser(props);
  };

  // Header-i i admin panel mban statistikat, tab-et dhe search input.
  const renderHeader = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>ADMIN SPACE</Text>
            <Text style={styles.title}>Control Panel</Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutChip, loggingOut && styles.logoutChipDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Text style={styles.logoutChipText}>{loggingOut ? '...' : 'Logout'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Manage apartments, bookings, cities, and user roles.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{apartments.length}</Text>
          <Text style={styles.statLabel}>Apartments</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatPrice(stats.monthlyRent)}</Text>
          <Text style={styles.statLabel}>Rent/month</Text>
        </View>
      </View>

      <View style={styles.smallStatsRow}>
        <Text style={styles.smallStat}>Owners: {stats.owners}</Text>
        <Text style={styles.smallStat}>Clients: {stats.clients}</Text>
        <Text style={styles.smallStat}>Admins: {stats.admins}</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => switchTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, city, dates..."
        placeholderTextColor="#8F97A8"
        style={styles.searchInput}
      />

      <Text style={styles.sectionTitle}>
        {activeTab === 'overview'
          ? 'Cities'
          : activeTab === 'apartments'
            ? 'All apartments'
            : activeTab === 'bookings'
              ? 'All bookings'
              : 'Users'}
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadAdminData}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? <ActivityIndicator color="#14213D" /> : <Text style={styles.emptyTitle}>No data found</Text>}
            <Text style={styles.emptyText}>
              {loading ? 'Loading data...' : 'Try another search or switch tabs.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Stilet per admin panel: tabs, statistika, karta dhe veprime administrative.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F7',
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: '#FCA5A5',
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#D3DAE6',
    marginTop: 8,
    lineHeight: 20,
  },
  logoutChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutChipDisabled: {
    opacity: 0.7,
  },
  logoutChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DEE4EF',
  },
  statValue: {
    color: '#14213D',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#667085',
    marginTop: 4,
    fontWeight: '700',
  },
  smallStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  smallStat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 999,
    color: '#14213D',
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DEE4EF',
  },
  tabButton: {
    width: '50%',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: '#FF5A5F',
  },
  tabText: {
    color: '#667085',
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE4EF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#14213D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: '100%',
    height: 170,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#E5E7EB',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    color: '#14213D',
    fontSize: 19,
    fontWeight: '800',
  },
  cardCity: {
    color: '#667085',
    marginTop: 4,
    fontWeight: '700',
  },
  priceBadge: {
    backgroundColor: '#FFE9EA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceBadgeText: {
    color: '#FF5A5F',
    fontWeight: '800',
  },
  roleBadge: {
    backgroundColor: '#EEF1F7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: '#14213D',
    fontWeight: '800',
  },
  cardDesc: {
    color: '#667085',
    lineHeight: 20,
    marginBottom: 10,
  },
  metaText: {
    color: '#14213D',
    fontWeight: '700',
    marginTop: 6,
  },
  openHint: {
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 12,
  },
  detailsPanel: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 14,
    paddingTop: 14,
  },
  detailLine: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  metaValue: {
    color: '#14213D',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  secondaryButtonFull: {
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  secondaryButtonText: {
    color: '#14213D',
    fontWeight: '800',
  },
  disabledText: {
    color: '#667085',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  fullDeleteButton: {
    backgroundColor: '#FFE9EA',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#D92D20',
    fontWeight: '800',
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    borderColor: '#DEE4EF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  roleButtonText: {
    color: '#14213D',
    fontWeight: '800',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#14213D',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: '#667085',
    marginTop: 10,
    textAlign: 'center',
  },
});
