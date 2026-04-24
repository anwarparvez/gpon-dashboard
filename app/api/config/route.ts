import { NextResponse } from 'next/server';

// Server-side only import
const RADIUS_METERS = parseInt(process.env.RADIUS_METER || '5', 10);

export async function GET() {
  try {
    return NextResponse.json({
      radiusMeters: RADIUS_METERS,
      radiusApplied: `${RADIUS_METERS} meters`,
      message: `Location updates blocked within ${RADIUS_METERS} meters`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// Optional: Add POST method to update config (if needed)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Note: Updating environment variables at runtime is not recommended
    // This is just for demonstration/development purposes
    if (process.env.NODE_ENV === 'development') {
      // In development, you might want to update a config file
      return NextResponse.json({
        message: 'Config update not implemented in production',
        currentRadius: RADIUS_METERS,
      });
    }
    
    return NextResponse.json(
      { error: 'Cannot update configuration at runtime' },
      { status: 403 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}