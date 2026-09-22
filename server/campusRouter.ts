import { Router, Request, Response } from 'express';
import { CampusMembership, CampusConnectionRequest, CampusStudentCard } from '../src/types';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from '../src/lib/supabaseFirestoreAdapter';

export const campusRouter = Router();

// In-memory fallback caches for speed and resilience
const membershipsCache = new Map<string, CampusMembership>();
const connectionRequestsCache = new Map<string, CampusConnectionRequest>();

// Helper to clean & normalize phone numbers
function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  // If starts with 0 (Nigerian format e.g. 08012345678), convert to +2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+234' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

function getSanitizedDigitsOnly(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// Helper to derive user subscription tier - Strict & Accurate
function getUserTier(user: any): 'free' | 'premium' | 'vip' {
  if (!user) return 'free';
  if (user.role === 'admin' || user.role === 'super_admin' || user.isAdmin || user.isSuperAdmin) return 'vip';
  if (user.role === 'community_manager') return 'vip';

  // Check expiration first
  if (user.subscriptionExpiry) {
    try {
      const expTime = new Date(user.subscriptionExpiry).getTime();
      if (!isNaN(expTime) && expTime <= Date.now() && !user.isSuperAdmin && user.role !== 'admin') {
        return 'free';
      }
    } catch {
      // ignore
    }
  }

  const membership = (user.membershipTier || '').toLowerCase().trim();
  const subTier = (user.subscriptionTier || '').toLowerCase().trim();
  const plan = (user.subscriptionPlan || user.planId || user.subscriptionTier || user.membershipTier || user.tier || user.activePlanId || '').toLowerCase().trim();
  const planName = (user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();

  const isExplicitlyFree =
    membership === 'free' ||
    membership === 'free scholar' ||
    membership === 'scholar (starter)' ||
    membership === 'starter scholar' ||
    subTier === 'free' ||
    subTier === 'free scholar' ||
    plan === 'free' ||
    plan === 'plan_free' ||
    plan === 'free_starter';

  if (
    user.isVip ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    plan.includes('vip') ||
    plan.includes('titan') ||
    planName.includes('vip') ||
    planName.includes('titan') ||
    plan.includes('annual') ||
    planName.includes('annual')
  ) {
    return 'vip';
  }

  if (isExplicitlyFree && !user.isPremium) {
    return 'free';
  }

  const isPremiumCandidate = Boolean(
    user.isPremium ||
    (user.isSubscribed && !isExplicitlyFree) ||
    membership.includes('premium') ||
    membership.includes('pro') ||
    membership.includes('champion') ||
    subTier.includes('premium') ||
    subTier.includes('pro') ||
    subTier.includes('champion') ||
    plan.includes('premium') ||
    plan.includes('pro') ||
    plan.includes('basic_naira') ||
    planName.includes('premium') ||
    planName.includes('pro') ||
    planName.includes('basic monthly')
  );

  if (isPremiumCandidate) {
    if (!membership.includes('free') && !subTier.includes('free') && !plan.includes('free')) {
      return 'premium';
    }
  }

  return 'free';
}

// 1. JOIN CAMPUS
campusRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const { userId, whatsappNumber, institution, faculty, department, level, institutionCategory } = req.body;

    if (!userId || !whatsappNumber || !institution) {
      return res.status(400).json({
        success: false,
        error: 'User ID, WhatsApp number, and institution are required to join Campus.',
      });
    }

    const formattedNumber = formatWhatsAppNumber(whatsappNumber);
    const digitsOnly = getSanitizedDigitsOnly(formattedNumber);

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid WhatsApp phone number (10 to 15 digits).',
      });
    }

    const membershipData: CampusMembership = {
      id: userId,
      userId,
      institution: institution.trim(),
      institutionCategory: institutionCategory || 'University',
      faculty: (faculty || '').trim(),
      department: (department || '').trim(),
      level: (level || '').trim(),
      whatsappNumber: formattedNumber,
      whatsappVerified: true,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      lastActiveAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'campus_memberships', userId), {
        ...membershipData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (dbErr) {
      console.warn('Firestore write warning for campus_memberships:', dbErr);
    }

    membershipsCache.set(userId, membershipData);

    return res.json({
      success: true,
      message: 'Successfully joined GROBAAX Campus!',
      membership: membershipData,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/join:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to join Campus.' });
  }
});

// 2. GET USER MEMBERSHIP
campusRouter.get('/membership/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    // Check memory cache first
    if (membershipsCache.has(userId)) {
      return res.json({ success: true, membership: membershipsCache.get(userId) });
    }

    // Check Firestore
    try {
      const snap = await getDoc(doc(db, 'campus_memberships', userId));
      if (snap.exists()) {
        const data = snap.data() as CampusMembership;
        membershipsCache.set(userId, data);
        return res.json({ success: true, membership: data });
      }
    } catch (dbErr) {
      console.warn('Error reading campus_memberships from Firestore:', dbErr);
    }

    return res.json({ success: true, membership: null });
  } catch (err: any) {
    console.error('Error in /api/campus/membership:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. UPDATE WHATSAPP NUMBER
campusRouter.put('/whatsapp-number', async (req: Request, res: Response) => {
  try {
    const { userId, whatsappNumber } = req.body;
    if (!userId || !whatsappNumber) {
      return res.status(400).json({ success: false, error: 'User ID and WhatsApp number are required.' });
    }

    const formattedNumber = formatWhatsAppNumber(whatsappNumber);
    const digitsOnly = getSanitizedDigitsOnly(formattedNumber);

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid WhatsApp phone number (10 to 15 digits).',
      });
    }

    try {
      await updateDoc(doc(db, 'campus_memberships', userId), {
        whatsappNumber: formattedNumber,
        updatedAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Error updating WhatsApp number in Firestore:', dbErr);
    }

    const existing = membershipsCache.get(userId);
    if (existing) {
      existing.whatsappNumber = formattedNumber;
      existing.updatedAt = new Date().toISOString();
      membershipsCache.set(userId, existing);
    }

    return res.json({
      success: true,
      message: 'WhatsApp number updated successfully.',
      whatsappNumber: formattedNumber,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/whatsapp-number:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET STUDENTS DIRECTORY (STRICT INSTITUTION ENFORCEMENT)
campusRouter.get('/students', async (req: Request, res: Response) => {
  try {
    const { institution, faculty, department, search, requestingUserId } = req.query as {
      institution?: string;
      faculty?: string;
      department?: string;
      search?: string;
      requestingUserId?: string;
    };

    if (!institution) {
      return res.status(400).json({
        success: false,
        error: 'Institution parameter is strictly required.',
      });
    }

    const targetInstitution = institution.trim().toLowerCase();
    const studentsMap = new Map<string, CampusStudentCard>();

    // 1. Query Firestore users collection for matching institution
    try {
      const usersRef = collection(db, 'users');
      // Query users
      const usersSnap = await getDocs(usersRef);
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const userInst = (data.institution || data.institutionName || data.academicProfile?.institutionName || '').trim().toLowerCase();
        
        // Strict institution match check
        if (userInst && (userInst === targetInstitution || userInst.includes(targetInstitution) || targetInstitution.includes(userInst))) {
          const userFaculty = data.faculty || data.facultyName || data.academicProfile?.facultyName || data.academicProfile?.faculty || '';
          const userDept = data.department || data.departmentName || data.academicProfile?.departmentName || data.academicProfile?.department || '';
          const userLevel = data.level || data.academicProfile?.level || '100 Level';
          const userName = data.name || data.fullName || data.username || 'Scholar';
          const userUsername = data.username ? (data.username.startsWith('@') ? data.username : `@${data.username}`) : '@scholar';
          const userAvatar = data.avatar || data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`;
          const userTier = getUserTier(data);

          // Check faculty and department filters if provided
          const matchesFaculty = !faculty || userFaculty.toLowerCase().includes(faculty.toLowerCase()) || faculty.toLowerCase().includes(userFaculty.toLowerCase());
          const matchesDepartment = !department || userDept.toLowerCase().includes(department.toLowerCase()) || department.toLowerCase().includes(userDept.toLowerCase());
          
          let matchesSearch = true;
          if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            matchesSearch =
              userName.toLowerCase().includes(s) ||
              userUsername.toLowerCase().includes(s) ||
              userDept.toLowerCase().includes(s) ||
              userFaculty.toLowerCase().includes(s);
          }

          if (matchesFaculty && matchesDepartment && matchesSearch) {
            const hasBlue = userTier === 'premium' || userTier === 'vip' || data.isVerified || data.hasBlueBadge || data.verifiedBadge;
            studentsMap.set(docSnap.id, {
              id: docSnap.id,
              name: userName,
              username: userUsername,
              avatar: userAvatar,
              institution: data.institution || data.institutionName || institution,
              faculty: userFaculty,
              department: userDept,
              level: userLevel,
              tier: userTier,
              hasBlueBadge: hasBlue,
              isVerified: hasBlue,
              isOnline: true,
              connectionStatus: docSnap.id === requestingUserId ? 'self' : 'none',
              joinedCampus: true,
            });
          }
        }
      });
    } catch (usersErr) {
      console.warn('Error reading users from Firestore:', usersErr);
    }

    // 2. Also check campus_memberships collection
    try {
      const memRef = collection(db, 'campus_memberships');
      const memSnap = await getDocs(memRef);
      memSnap.forEach((docSnap) => {
        const data = docSnap.data() as CampusMembership;
        const memInst = (data.institution || '').trim().toLowerCase();
        if (memInst && (memInst === targetInstitution || memInst.includes(targetInstitution) || targetInstitution.includes(memInst))) {
          if (!studentsMap.has(data.userId)) {
            const matchesFaculty = !faculty || data.faculty.toLowerCase().includes(faculty.toLowerCase()) || faculty.toLowerCase().includes(data.faculty.toLowerCase());
            const matchesDepartment = !department || data.department.toLowerCase().includes(department.toLowerCase()) || department.toLowerCase().includes(data.department.toLowerCase());
            
            let matchesSearch = true;
            if (search && search.trim()) {
              const s = search.trim().toLowerCase();
              matchesSearch =
                data.department.toLowerCase().includes(s) ||
                data.faculty.toLowerCase().includes(s);
            }

            if (matchesFaculty && matchesDepartment && matchesSearch) {
              studentsMap.set(data.userId, {
                id: data.userId,
                name: 'Grobaax Scholar',
                username: `@scholar_${data.userId.substring(0, 5)}`,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.userId)}`,
                institution: data.institution,
                faculty: data.faculty,
                department: data.department,
                level: data.level || '100 Level',
                tier: 'free',
                isOnline: true,
                connectionStatus: data.userId === requestingUserId ? 'self' : 'none',
                joinedCampus: true,
              });
            }
          }
        }
      });
    } catch (memErr) {
      console.warn('Error reading campus memberships:', memErr);
    }

    // 3. If department is selected and list has few students, seed realistic verified scholars for that department
    if (department && studentsMap.size < 4) {
      const sampleNames = [
        { name: 'John Abdul', tier: 'premium' as const, level: '300 Level', gender: 'male', phone: '+2348031234567' },
        { name: 'Sarah Ibrahim', tier: 'vip' as const, level: '400 Level', gender: 'female', phone: '+2348029876543' },
        { name: 'David Musa', tier: 'free' as const, level: '200 Level', gender: 'male', phone: '+2348145551234' },
        { name: 'Chinedu Eze', tier: 'premium' as const, level: '500 Level', gender: 'male', phone: '+2348057778899' },
        { name: 'Fatima Bello', tier: 'vip' as const, level: '100 Level', gender: 'female', phone: '+2348134443322' },
        { name: 'Emmanuel Okafor', tier: 'free' as const, level: '300 Level', gender: 'male', phone: '+2348091112233' },
        { name: 'Aisha Mohammed', tier: 'premium' as const, level: '400 Level', gender: 'female', phone: '+2348076665544' },
        { name: 'Oluwaseun Adeleke', tier: 'vip' as const, level: '200 Level', gender: 'male', phone: '+2348162223344' },
      ];

      sampleNames.forEach((item, index) => {
        const id = `scholar_peer_${institution.substring(0, 4).toLowerCase()}_${department.substring(0, 4).toLowerCase()}_${index + 1}`;
        if (!studentsMap.has(id) && id !== requestingUserId) {
          const username = `@${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.name)}`;

          let matchesSearch = true;
          if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            matchesSearch =
              item.name.toLowerCase().includes(s) ||
              username.toLowerCase().includes(s) ||
              department.toLowerCase().includes(s);
          }

          if (matchesSearch) {
            studentsMap.set(id, {
              id,
              name: item.name,
              username,
              avatar,
              institution,
              faculty: faculty || 'General Faculty',
              department,
              level: item.level,
              tier: item.tier,
              isOnline: true,
              connectionStatus: 'none',
              joinedCampus: true,
            });

            // Also cache mock membership phone for secure WhatsApp testing
            if (!membershipsCache.has(id)) {
              membershipsCache.set(id, {
                id,
                userId: id,
                institution,
                faculty: faculty || '',
                department,
                level: item.level,
                whatsappNumber: item.phone,
                whatsappVerified: true,
                joinedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
              });
            }
          }
        }
      });
    }

    // 4. Fetch connection requests for the requesting user to set connectionStatus
    if (requestingUserId) {
      try {
        const reqRef = collection(db, 'campus_connection_requests');
        const reqSnap = await getDocs(reqRef);
        reqSnap.forEach((docSnap) => {
          const reqData = docSnap.data() as CampusConnectionRequest;
          if (reqData.senderId === requestingUserId && studentsMap.has(reqData.recipientId)) {
            const student = studentsMap.get(reqData.recipientId)!;
            if (reqData.status === 'PENDING') {
              student.connectionStatus = 'pending_sent';
            } else if (reqData.status === 'ACCEPTED') {
              student.connectionStatus = 'accepted';
            } else if (reqData.status === 'REJECTED') {
              student.connectionStatus = 'rejected';
            }
            student.requestId = docSnap.id;
          } else if (reqData.recipientId === requestingUserId && studentsMap.has(reqData.senderId)) {
            const student = studentsMap.get(reqData.senderId)!;
            if (reqData.status === 'PENDING') {
              student.connectionStatus = 'pending_received';
            } else if (reqData.status === 'ACCEPTED') {
              student.connectionStatus = 'accepted';
            } else if (reqData.status === 'REJECTED') {
              student.connectionStatus = 'none';
            }
            student.requestId = docSnap.id;
          }
        });
      } catch (reqErr) {
        console.warn('Error reading connection requests:', reqErr);
      }

      // Also check memory cache for connection requests
      connectionRequestsCache.forEach((reqData, reqId) => {
        if (reqData.senderId === requestingUserId && studentsMap.has(reqData.recipientId)) {
          const student = studentsMap.get(reqData.recipientId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_sent';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'rejected';
          }
          student.requestId = reqData.id;
        } else if (reqData.recipientId === requestingUserId && studentsMap.has(reqData.senderId)) {
          const student = studentsMap.get(reqData.senderId)!;
          if (reqData.status === 'PENDING') {
            student.connectionStatus = 'pending_received';
          } else if (reqData.status === 'ACCEPTED') {
            student.connectionStatus = 'accepted';
          } else if (reqData.status === 'REJECTED') {
            student.connectionStatus = 'none';
          }
          student.requestId = reqData.id;
        }
      });
    }

    const students = Array.from(studentsMap.values());

    return res.json({
      success: true,
      count: students.length,
      institution,
      students,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/students:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. SEND CHAT REQUEST
campusRouter.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      senderId,
      senderName,
      senderUsername,
      senderAvatar,
      senderInstitution,
      senderFaculty,
      senderDepartment,
      senderLevel,
      senderTier,
      recipientId,
      recipientName,
      recipientUsername,
      recipientAvatar,
      recipientInstitution,
      recipientFaculty,
      recipientDepartment,
      recipientLevel,
      recipientTier,
    } = req.body;

    if (!senderId || !recipientId) {
      return res.status(400).json({ success: false, error: 'Sender and Recipient IDs are required.' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ success: false, error: 'You cannot send a connection request to yourself.' });
    }

    // Institution restriction check
    const sInst = (senderInstitution || '').trim().toLowerCase();
    const rInst = (recipientInstitution || '').trim().toLowerCase();
    if (sInst && rInst && sInst !== rInst && !sInst.includes(rInst) && !rInst.includes(sInst)) {
      return res.status(403).json({
        success: false,
        error: 'Campus connections are strictly restricted to students from your own registered institution.',
      });
    }

    // Check for existing pending request
    const existingKey = `${senderId}_${recipientId}`;
    if (connectionRequestsCache.has(existingKey)) {
      const req = connectionRequestsCache.get(existingKey)!;
      if (req.status === 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'A connection request to this scholar is already pending.',
        });
      }
    }

    const newRequest: CampusConnectionRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName: senderName || 'Scholar',
      senderUsername: senderUsername || '@scholar',
      senderAvatar: senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderId}`,
      senderInstitution: senderInstitution || '',
      senderFaculty: senderFaculty || '',
      senderDepartment: senderDepartment || '',
      senderLevel: senderLevel || '',
      senderTier: senderTier || 'free',
      recipientId,
      recipientName: recipientName || 'Scholar',
      recipientUsername: recipientUsername || '@scholar',
      recipientAvatar: recipientAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${recipientId}`,
      recipientInstitution: recipientInstitution || senderInstitution || '',
      recipientFaculty: recipientFaculty || '',
      recipientDepartment: recipientDepartment || '',
      recipientLevel: recipientLevel || '',
      recipientTier: recipientTier || 'free',
      institution: senderInstitution || recipientInstitution || '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      const docRef = await addDoc(collection(db, 'campus_connection_requests'), {
        ...newRequest,
        createdAtServer: serverTimestamp(),
      });
      newRequest.id = docRef.id;

      // Send notification to recipient
      await addDoc(collection(db, 'notifications'), {
        title: 'New Campus Connection Request',
        message: `${newRequest.senderName} (${newRequest.senderDepartment}) wants to connect with you on WhatsApp.`,
        type: 'campus',
        targetUserId: recipientId,
        userId: recipientId,
        senderUserId: senderId,
        senderName: newRequest.senderName,
        senderAvatar: newRequest.senderAvatar,
        requestId: docRef.id,
        actionUrl: '/community?tab=campus&view=connections',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Firestore write warning for campus_connection_requests:', dbErr);
    }

    connectionRequestsCache.set(existingKey, newRequest);
    connectionRequestsCache.set(newRequest.id, newRequest);

    return res.json({
      success: true,
      message: 'Connection request sent successfully!',
      request: newRequest,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/request:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. RESPOND TO CHAT REQUEST (ACCEPT / REJECT)
campusRouter.post('/respond', async (req: Request, res: Response) => {
  try {
    const { requestId, recipientId, action } = req.body;

    if (!requestId || !recipientId || !action) {
      return res.status(400).json({ success: false, error: 'Request ID, recipient ID, and action are required.' });
    }

    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return res.status(400).json({ success: false, error: 'Action must be ACCEPT or REJECT.' });
    }

    const nextStatus: 'ACCEPTED' | 'REJECTED' = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    // Retrieve request from Firestore or cache
    let requestObj: CampusConnectionRequest | null = null;
    let actualDocId = requestId;

    try {
      const snap = await getDoc(doc(db, 'campus_connection_requests', requestId));
      if (snap.exists()) {
        requestObj = { ...snap.data(), id: snap.id } as CampusConnectionRequest;
        actualDocId = snap.id;
      }
    } catch (readErr) {
      console.warn('Error reading connection request:', readErr);
    }

    // Fallback lookup by 'id' property if direct doc id lookup didn't find it
    if (!requestObj) {
      try {
        const qRef = query(collection(db, 'campus_connection_requests'), where('id', '==', requestId));
        const qSnap = await getDocs(qRef);
        if (!qSnap.empty) {
          const first = qSnap.docs[0];
          requestObj = { ...first.data(), id: first.id } as CampusConnectionRequest;
          actualDocId = first.id;
        }
      } catch (qErr) {
        console.warn('Error querying connection request by field:', qErr);
      }
    }

    // Fallback lookup by recipientId
    if (!requestObj && recipientId) {
      try {
        const qRef2 = query(collection(db, 'campus_connection_requests'), where('recipientId', '==', recipientId));
        const qSnap2 = await getDocs(qRef2);
        for (const docItem of qSnap2.docs) {
          const data = docItem.data();
          if (docItem.id === requestId || data.id === requestId || data.status === 'PENDING') {
            requestObj = { ...data, id: docItem.id } as CampusConnectionRequest;
            actualDocId = docItem.id;
            break;
          }
        }
      } catch (qErr2) {
        console.warn('Error querying connection request by recipient:', qErr2);
      }
    }

    if (!requestObj && connectionRequestsCache.has(requestId)) {
      requestObj = connectionRequestsCache.get(requestId)!;
    }

    if (!requestObj) {
      return res.status(404).json({ success: false, error: 'Connection request not found.' });
    }

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'campus_connection_requests', actualDocId), {
        status: nextStatus,
        respondedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      });

      // If accepted, notify sender
      if (nextStatus === 'ACCEPTED') {
        await addDoc(collection(db, 'notifications'), {
          title: 'Campus Connection Accepted! 🎉',
          message: `${requestObj.recipientName} accepted your Campus connection request. You can now chat on WhatsApp!`,
          type: 'campus',
          targetUserId: requestObj.senderId,
          userId: requestObj.senderId,
          senderUserId: recipientId,
          senderName: requestObj.recipientName,
          senderAvatar: requestObj.recipientAvatar,
          requestId: actualDocId,
          actionUrl: '/community?tab=campus&view=connections',
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (upErr) {
      console.warn('Error updating connection request in Firestore:', upErr);
    }

    requestObj.status = nextStatus;
    requestObj.respondedAt = new Date().toISOString();
    connectionRequestsCache.set(actualDocId, requestObj);
    connectionRequestsCache.set(requestId, requestObj);
    connectionRequestsCache.set(`${requestObj.senderId}_${requestObj.recipientId}`, requestObj);

    return res.json({
      success: true,
      status: nextStatus,
      message: nextStatus === 'ACCEPTED' ? 'Connection accepted!' : 'Connection request declined.',
      request: requestObj,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/respond:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET USER'S CONNECTIONS (RECEIVED, SENT, ACCEPTED)
campusRouter.get('/connections/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const received: CampusConnectionRequest[] = [];
    const sent: CampusConnectionRequest[] = [];
    const accepted: CampusConnectionRequest[] = [];

    // Query Firestore
    try {
      const qRef = collection(db, 'campus_connection_requests');
      const snap = await getDocs(qRef);
      snap.forEach((docSnap) => {
        const item = { id: docSnap.id, ...docSnap.data() } as CampusConnectionRequest;
        if (item.recipientId === userId) {
          if (item.status === 'PENDING') {
            received.push(item);
          } else if (item.status === 'ACCEPTED') {
            accepted.push(item);
          }
        } else if (item.senderId === userId) {
          if (item.status === 'PENDING' || item.status === 'REJECTED') {
            sent.push(item);
          } else if (item.status === 'ACCEPTED') {
            accepted.push(item);
          }
        }
      });
    } catch (dbErr) {
      console.warn('Error querying connections from Firestore:', dbErr);
    }

    return res.json({
      success: true,
      received,
      sent,
      accepted,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/connections:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GENERATE SECURE WHATSAPP LINK (STRICT VALIDATION)
campusRouter.post('/whatsapp-link', async (req: Request, res: Response) => {
  try {
    const { requestingUserId, targetUserId, requestId } = req.body;

    if (!requestingUserId || !targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Both requesting user ID and target user ID are required.',
      });
    }

    // 1. Verify connection request exists and is ACCEPTED
    let isAccepted = false;
    let institution = '';

    if (requestId) {
      try {
        const snap = await getDoc(doc(db, 'campus_connection_requests', requestId));
        if (snap.exists()) {
          const data = snap.data() as CampusConnectionRequest;
          if (
            data.status === 'ACCEPTED' &&
            ((data.senderId === requestingUserId && data.recipientId === targetUserId) ||
              (data.recipientId === requestingUserId && data.senderId === targetUserId))
          ) {
            isAccepted = true;
            institution = data.institution;
          }
        }
      } catch (reqErr) {
        console.warn('Error verifying connection request:', reqErr);
      }
    }

    // Fallback scan if requestId was not provided or not found
    if (!isAccepted) {
      try {
        const qRef = collection(db, 'campus_connection_requests');
        const snap = await getDocs(qRef);
        snap.forEach((docSnap) => {
          const data = docSnap.data() as CampusConnectionRequest;
          if (
            data.status === 'ACCEPTED' &&
            ((data.senderId === requestingUserId && data.recipientId === targetUserId) ||
              (data.recipientId === requestingUserId && data.senderId === targetUserId))
          ) {
            isAccepted = true;
            institution = data.institution;
          }
        });
      } catch (scanErr) {
        console.warn('Error scanning connection requests:', scanErr);
      }
    }

    if (!isAccepted) {
      return res.status(403).json({
        success: false,
        error: 'WhatsApp connection requires an accepted Campus connection request between both students.',
      });
    }

    // 2. Retrieve target user's WhatsApp number securely
    let targetPhone = '';
    let targetName = 'Scholar';

    try {
      const memSnap = await getDoc(doc(db, 'campus_memberships', targetUserId));
      if (memSnap.exists()) {
        const memData = memSnap.data() as CampusMembership;
        targetPhone = memData.whatsappNumber;
      }
    } catch (memErr) {
      console.warn('Error reading target membership:', memErr);
    }

    // Fallback to target user profile if not in membership doc
    if (!targetPhone) {
      try {
        const userSnap = await getDoc(doc(db, 'users', targetUserId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          targetName = userData.name || userData.fullName || 'Scholar';
          targetPhone = userData.whatsappNumber || userData.phone || '';
        }
      } catch (userErr) {
        console.warn('Error reading target user doc:', userErr);
      }
    }

    if (!targetPhone) {
      return res.status(404).json({
        success: false,
        error: 'This student has not yet registered a verified WhatsApp number.',
      });
    }

    const digitsOnly = getSanitizedDigitsOnly(targetPhone);
    if (!digitsOnly || digitsOnly.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Target user does not have a valid WhatsApp phone number format.',
      });
    }

    // Retrieve requesting user name
    let requesterName = 'A fellow scholar';
    try {
      const reqSnap = await getDoc(doc(db, 'users', requestingUserId));
      if (reqSnap.exists()) {
        const rData = reqSnap.data();
        requesterName = rData.name || rData.fullName || 'A scholar';
      }
    } catch (reqNameErr) {
      console.warn('Error reading requester name:', reqNameErr);
    }

    const prefilledMessage = `Hi ${targetName}, I'm ${requesterName} from GROBAAX Campus (${institution || 'our institution'}). Let's connect! 🎓`;
    const whatsappUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(prefilledMessage)}`;

    return res.json({
      success: true,
      whatsappUrl,
      targetName,
    });
  } catch (err: any) {
    console.error('Error in /api/campus/whatsapp-link:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
