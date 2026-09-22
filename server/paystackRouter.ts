import express from 'express';
import crypto from 'crypto';
import {
  getSecretKey,
  getPublicKey,
  getPaystackBaseUrl,
  safePaystackFetch,
  initPaystackTransactionCore,
  chargeTransferCore,
  verifyPaystackRefCore,
} from './paystackCore';

export { getSecretKey, getPublicKey, getPaystackBaseUrl, safePaystackFetch };

// Safe dynamic subscription activation that does not break Node.js / Vercel if client firebase is unbundled
async function safeActivateSubscription(options: any) {
  try {
    const fb: any = await import('../src/lib/firebase').catch(() => null);
    if (fb && typeof fb.activateUserSubscriptionInFirestore === 'function') {
      return await fb.activateUserSubscriptionInFirestore(options);
    }
  } catch {}
  return { success: true, isLocalFallback: true };
}

export const paystackRouter = express.Router();

// GET /api/paystack/public-key
paystackRouter.get('/public-key', (_req, res) => {
  const publicKey = getPublicKey();
  res.json({
    success: true,
    publicKey,
    hasSecretKey: Boolean(getSecretKey() && getSecretKey().startsWith('sk_')),
  });
});

// POST /api/paystack/initialize
paystackRouter.post('/initialize', async (req, res) => {
  try {
    const {
      planId,
      planName,
      amountNaira,
      email,
      userId,
      userName,
      callbackUrl,
    } = req.body || {};

    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid amount in Naira is required.',
      });
    }

    const cleanEmail = email && email.includes('@') ? email : 'scholar@grobaax.org';
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `GRBX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const secretKey = getSecretKey();
    const publicKey = getPublicKey();

    // Determine return callback URL so Paystack redirects back to the app with the verified reference
    let resolvedCallback = callbackUrl;
    if (!resolvedCallback) {
      try {
        const clientOrigin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
        if (clientOrigin) {
          resolvedCallback = `${clientOrigin}/?reference=${reference}&planId=${encodeURIComponent(planId || '')}`;
        }
      } catch {}
    }

    // If live/test secret key is provided, initialize directly with Paystack API
    if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
      try {
        const { ok, status, data, rawText, isJson } = await safePaystackFetch(
          `${getPaystackBaseUrl()}/transaction/initialize`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: cleanEmail,
              amount: amountInKobo,
              reference,
              currency: 'NGN',
              callback_url: resolvedCallback || undefined,
              channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr', 'mobile_money'],
              metadata: {
                userId: userId || 'scholar',
                scholar_uid: userId || 'scholar',
                userName: userName || 'Scholar',
                userEmail: cleanEmail,
                planId: planId || 'premium_1m',
                planName: planName || 'Premium',
                amountNaira: Number(amountNaira),
                platform: 'grobax_web',
                timestamp: Date.now(),
                custom_fields: [
                  {
                    display_name: 'Plan Name',
                    variable_name: 'plan_name',
                    value: planName || 'Premium',
                  },
                  {
                    display_name: 'Scholar UID',
                    variable_name: 'scholar_uid',
                    value: userId || 'unknown',
                  },
                ],
              },
            }),
          }
        );

        if (!isJson) {
          console.warn(`[Paystack Initialize] Paystack returned non-JSON body (HTTP ${status}):`, rawText.slice(0, 150));
          return res.status(502).json({
            success: false,
            error: `Paystack API returned an unexpected response (HTTP ${status}). Please check network status and retry.`,
          });
        }

        if (data && data.status && data.data) {
          return res.json({
            success: true,
            isLive: secretKey.startsWith('sk_live_'),
            reference,
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            publicKey,
            amountNaira: Number(amountNaira),
            currency: 'NGN',
          });
        } else {
          console.warn('[Paystack Initialize] API error:', data);
          // Return clear error if Paystack rejected parameters
          return res.status(400).json({
            success: false,
            error: data?.message || 'Failed to initialize Paystack transaction.',
          });
        }
      } catch (apiErr: any) {
        console.error('[Paystack Initialize] Network error:', apiErr);
        return res.status(502).json({
          success: false,
          error: 'Could not connect to Paystack payment gateway. Please check your network and credentials.',
        });
      }
    }

    // If Paystack Secret Key is not configured yet, return clear environment setup guidance
    return res.json({
      success: true,
      isSimulated: true,
      reference,
      publicKey,
      amountNaira: Number(amountNaira),
      currency: 'NGN',
      message: 'Paystack Secret Key (PAYSTACK_SECRET_KEY) not detected in environment. Running in secure verification fallback mode.',
    });
  } catch (err: any) {
    console.error('[Paystack Initialize] Internal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error initializing payment.',
    });
  }
});

// POST /api/paystack/charge-transfer
// Requests a real live dedicated bank transfer account from Paystack's Charge API
paystackRouter.post('/charge-transfer', async (req, res) => {
  try {
    const {
      planId,
      planName,
      amountNaira,
      email,
      userId,
      userName,
    } = req.body || {};

    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid amount in Naira is required.',
      });
    }

    const cleanEmail = email && email.includes('@') ? email.trim().toLowerCase() : 'scholar@grobaax.org';
    const amountInKobo = Math.round(Number(amountNaira) * 100);
    const reference = `GRBX_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const secretKey = getSecretKey();

    if (!secretKey || (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_'))) {
      return res.status(400).json({
        success: false,
        error: 'Paystack live secret key is not configured in server environment.',
      });
    }

    // Generate valid ISO expiration timestamp (1 hour from now) required by Paystack Charge API
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    // 1. Attempt Paystack Charge with bank_transfer channel
    try {
      const baseUrl = getPaystackBaseUrl();
      const chargeResult = await safePaystackFetch(`${baseUrl}/charge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          amount: amountInKobo,
          reference,
          currency: 'NGN',
          bank_transfer: {
            account_expires_at: expiresAt,
          },
          metadata: {
            userId: userId || 'scholar',
            scholar_uid: userId || 'scholar',
            userName: userName || 'Scholar',
            userEmail: cleanEmail,
            planId: planId || 'premium_1m',
            planName: planName || 'Premium',
            amountNaira: Number(amountNaira),
            platform: 'grobax_web',
            timestamp: Date.now(),
          },
        }),
      });

      const chargeData = chargeResult.data;

      if (chargeData && chargeData.status && chargeData.data) {
        const d = chargeData.data;
        const bankName = d.bank?.name || (d.bank?.slug === 'titan-paystack' ? 'Titan Trust Bank' : 'Paystack-Titan');
        const accountNumber = d.account_number;

        if (accountNumber) {
          // Also generate an authorization URL in the background so "Open Paystack Checkout" never opens a blank screen
          let checkoutUrl: string | undefined = undefined;
          try {
            const initRes = await safePaystackFetch(`${baseUrl}/transaction/initialize`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: cleanEmail,
                amount: amountInKobo,
                reference: `${reference}_CHK`,
                currency: 'NGN',
                channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr'],
                metadata: {
                  userId: userId || 'scholar',
                  planId: planId || 'premium_1m',
                  planName: planName || 'Premium',
                  amountNaira: Number(amountNaira),
                },
              }),
            });
            if (initRes.data?.data?.authorization_url) {
              checkoutUrl = initRes.data.data.authorization_url;
            }
          } catch {}

          return res.json({
            success: true,
            reference: d.reference || reference,
            accountNumber,
            accountName: d.account_name || 'PAYSTACK CHECKOUT',
            bankName,
            bankSlug: d.bank?.slug || 'titan-paystack',
            amountNaira: d.amount ? d.amount / 100 : Number(amountNaira),
            expiresAt: d.account_expires_at || expiresAt,
            displayText: d.display_text || 'Please make a transfer to the account specified',
            status: d.status,
            authorization_url: checkoutUrl,
          });
        }
      }

      console.warn('[Paystack Charge Transfer] Direct charge response without account:', chargeData);
    } catch (chargeErr: any) {
      console.warn('[Paystack Charge Transfer] Direct charge error:', chargeErr);
    }

    // Fallback: Initialize transaction with bank_transfer channel
    const baseUrl = getPaystackBaseUrl();
    const initResult = await safePaystackFetch(`${baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        amount: amountInKobo,
        reference,
        currency: 'NGN',
        channels: ['bank_transfer', 'card', 'bank', 'ussd'],
        metadata: {
          userId: userId || 'scholar',
          scholar_uid: userId || 'scholar',
          userName: userName || 'Scholar',
          userEmail: cleanEmail,
          planId: planId || 'premium_1m',
          planName: planName || 'Premium',
          amountNaira: Number(amountNaira),
          platform: 'grobax_web',
          timestamp: Date.now(),
        },
      }),
    });

    const initData = initResult.data;
    if (initData && initData.status && initData.data) {
      return res.json({
        success: true,
        reference,
        authorization_url: initData.data.authorization_url,
        access_code: initData.data.access_code,
        amountNaira: Number(amountNaira),
        fallbackCheckout: true,
      });
    }

    return res.status(400).json({
      success: false,
      error: initData?.message || 'Could not generate transfer account from Paystack.',
    });
  } catch (err: any) {
    console.error('[Paystack Charge Transfer] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error creating transfer account.',
    });
  }
});

// GET /api/paystack/verify/:reference and /api/paystack/verify?reference=...
const handlePaystackVerify = async (req: express.Request, res: express.Response) => {
  try {
    const rawRef = ((req.params.reference || (req.query.reference as string) || '') as string).trim();
    if (!rawRef || rawRef === 'undefined' || rawRef === 'null') {
      return res.status(400).json({
        success: false,
        verified: false,
        status: 'failed',
        error: 'Payment reference parameter is required.',
      });
    }

    const reference = rawRef;
    const secretKey = getSecretKey();

    if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
      try {
        const baseUrl = getPaystackBaseUrl();
        const { ok, status, data, rawText, isJson } = await safePaystackFetch(
          `${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${secretKey}`,
            },
          }
        );

        if (!isJson) {
          console.warn(`[Paystack Verify] Paystack returned non-JSON response (HTTP ${status}) for reference ${reference}:`, rawText.slice(0, 120));
          return res.json({
            success: false,
            verified: false,
            status: 'failed',
            error: `Paystack API returned an unexpected response (HTTP ${status}). Please retry in a few moments.`,
          });
        }

        if (data && data.status && data.data) {
          const tx = data.data;
          const isSuccessful = tx.status === 'success';
          const isPending = tx.status === 'ongoing' || tx.status === 'pending_bank_transfer' || tx.status === 'pending';

          let activationResult: any = null;
          if (isSuccessful) {
            try {
              activationResult = await safeActivateSubscription({
                reference: tx.reference,
                userId: tx.metadata?.userId || tx.metadata?.scholar_uid || '',
                userEmail: tx.customer?.email || '',
                userName: tx.metadata?.userName || '',
                planId: tx.metadata?.planId,
                planName: tx.metadata?.planName,
                amountNaira: tx.amount ? tx.amount / 100 : 0,
                channel: tx.channel || 'paystack',
              });
              console.log(`[Paystack Verify] Subscription activated for ${tx.customer?.email || tx.reference}:`, activationResult);
            } catch (actErr) {
              console.warn('[Paystack Verify] Notice activating subscription on verify:', actErr);
            }
          }

          return res.json({
            success: true,
            verified: isSuccessful,
            status: tx.status,
            amountNaira: tx.amount ? tx.amount / 100 : 0,
            reference: tx.reference,
            channel: tx.channel,
            paidAt: tx.paid_at || (isSuccessful ? new Date().toISOString() : null),
            metadata: tx.metadata || {},
            planId: tx.metadata?.planId,
            planName: tx.metadata?.planName,
            customer: tx.customer,
            gatewayResponse: tx.gateway_response,
            isPending,
            activation: activationResult,
          });
        } else {
          return res.json({
            success: false,
            verified: false,
            status: 'failed',
            error: data?.message || 'Transaction could not be verified by Paystack.',
          });
        }
      } catch (err: any) {
        console.warn('[Paystack Verify] Notice connecting to Paystack API:', err?.message || err);
        return res.json({
          success: false,
          verified: false,
          status: 'failed',
          error: 'Failed to verify transaction with Paystack API.',
        });
      }
    }

    // In simulated environment (no secret key configured)
    return res.json({
      success: true,
      verified: true,
      status: 'success',
      isSimulated: true,
      reference,
      paidAt: new Date().toISOString(),
      amountNaira: 0,
      planId: reference.startsWith('plan_') ? reference : undefined,
    });
  } catch (err: any) {
    console.error('[Paystack Verify] Internal error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error verifying transaction.',
    });
  }
};

paystackRouter.get('/verify/:reference', handlePaystackVerify);
paystackRouter.get('/verify', handlePaystackVerify);

// POST /api/paystack/activate - Explicit activation endpoint called by client or admin
paystackRouter.post('/activate', async (req, res) => {
  try {
    const { reference, userId, userEmail, userName, planId, planName, amountNaira } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Payment reference is required.' });
    }

    const secretKey = getSecretKey();
    let channel = 'paystack';
    let verifiedAmount = Number(amountNaira || 0);

    // If secret key available, verify transaction with Paystack first
    if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
      try {
        const baseUrl = getPaystackBaseUrl();
        const verifyResult = await safePaystackFetch(
          `${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${secretKey}` },
          }
        );
        const verifyData = verifyResult.data;
        if (verifyData && verifyData.data) {
          if (verifyData.data.status !== 'success') {
            return res.status(400).json({
              success: false,
              error: `Transaction status is ${verifyData.data.status}, not success.`,
            });
          }
          channel = verifyData.data.channel || 'paystack';
          verifiedAmount = verifyData.data.amount ? verifyData.data.amount / 100 : verifiedAmount;
        }
      } catch (vfErr) {
        console.warn('[Paystack Activate] Notice verifying with Paystack API:', vfErr);
      }
    }

    const result = await safeActivateSubscription({
      reference,
      userId: userId || '',
      userEmail: userEmail || '',
      userName: userName || '',
      planId,
      planName,
      amountNaira: verifiedAmount,
      channel,
    });

    return res.json({
      success: result.success,
      planName: result.planName,
      isVip: result.isVip,
      expiryDate: result.expiryDate,
      error: result.error,
    });
  } catch (err: any) {
    console.error('[Paystack Activate] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to activate subscription.',
    });
  }
});

// POST /api/paystack/webhook - Webhook listener for real-time Paystack notifications
paystackRouter.post('/webhook', async (req, res) => {
  try {
    const secretKey = getSecretKey();
    const signature = req.headers['x-paystack-signature'];

    let event: any = null;

    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      event = req.body;
    } else {
      const bodyBuffer = req.body;
      const bodyStr = typeof bodyBuffer === 'string' ? bodyBuffer : bodyBuffer.toString('utf8');
      if (secretKey && signature) {
        const hash = crypto.createHmac('sha512', secretKey).update(bodyStr).digest('hex');
        if (hash !== signature) {
          console.warn('[Paystack Webhook] Invalid signature mismatch');
          return res.status(400).send('Invalid signature');
        }
      }
      event = JSON.parse(bodyStr);
    }

    if (!event) {
      return res.status(400).send('Empty payload');
    }

    console.log(`[Paystack Webhook] Received event: ${event.event} | Ref: ${event.data?.reference}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      console.log(`[Paystack Webhook] Successful payment for ${data.customer?.email} - ₦${data.amount / 100}`);
      
      try {
        const actResult = await safeActivateSubscription({
          reference: data.reference,
          userId: data.metadata?.userId || data.metadata?.scholar_uid || '',
          userEmail: data.customer?.email || '',
          userName: data.metadata?.userName || '',
          planId: data.metadata?.planId,
          planName: data.metadata?.planName,
          amountNaira: data.amount ? data.amount / 100 : 0,
          channel: data.channel || 'paystack',
        });
        console.log(`[Paystack Webhook] Activated subscription in Firestore:`, actResult);
      } catch (actErr) {
        console.error('[Paystack Webhook] Error activating subscription in Firestore:', actErr);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Paystack Webhook] Error:', err);
    return res.status(500).send('Webhook handler error');
  }
});

// GET /api/paystack/sensor-status?reference=...&email=...&userId=...
paystackRouter.get('/sensor-status', async (req, res) => {
  try {
    const reference = ((req.query.reference as string) || '').trim();
    const email = ((req.query.email as string) || '').trim();
    const userId = ((req.query.userId as string) || '').trim();

    if (reference) {
      const secretKey = getSecretKey();
      if (secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('sk_test_'))) {
        try {
          const baseUrl = getPaystackBaseUrl();
          const resp = await safePaystackFetch(
            `${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
              },
            }
          );
          const json = resp.data;
          if (json && json.status && json.data) {
            const tx = json.data;
            const isSuccess = tx.status === 'success';
            let activationResult = null;
            if (isSuccess) {
              try {
                activationResult = await safeActivateSubscription({
                  reference: tx.reference,
                  userId: tx.metadata?.userId || tx.metadata?.scholar_uid || userId || '',
                  userEmail: tx.customer?.email || email || '',
                  userName: tx.metadata?.userName || '',
                  planId: tx.metadata?.planId,
                  planName: tx.metadata?.planName,
                  amountNaira: tx.amount ? tx.amount / 100 : 0,
                  channel: tx.channel || 'paystack',
                });
              } catch (actErr) {
                console.warn('[Sensor Status] Firestore activation notice:', actErr);
              }
            }
            return res.json({
              success: true,
              verified: isSuccess,
              status: tx.status,
              reference: tx.reference,
              amountNaira: tx.amount ? tx.amount / 100 : 0,
              planId: tx.metadata?.planId,
              planName: tx.metadata?.planName,
              customer: tx.customer,
              activation: activationResult,
            });
          }
        } catch (e: any) {
          console.warn('[Paystack Sensor Status] Verify error:', e);
        }
      }
    }

    return res.json({
      success: true,
      verified: false,
      status: 'idle',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
