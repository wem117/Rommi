#!/bin/bash

required=(
"src/app/layout.tsx"
"src/app/page.tsx"
"src/app/globals.css"
"src/components"
"src/lib/firebase"
"src/hooks"
"src/context"
"src/types"
"public/images"
"package.json"
)

missing=0

echo "================================="
echo "RoommateKZ Structure Check"
echo "================================="

for item in "${required[@]}"; do
    if [ -e "$item" ]; then
        echo "✅ $item"
    else
        echo "❌ MISSING: $item"
        ((missing++))
    fi
done

echo
if [ $missing -eq 0 ]; then
    echo "🎉 All required files/folders exist."
else
    echo "⚠️ Missing items: $missing"
fi#!/bin/bash

required=(
"src/app/layout.tsx"
"src/app/page.tsx"
"src/app/globals.css"

"src/app/(auth)/layout.tsx"
"src/app/(auth)/sign-in/page.tsx"
"src/app/(auth)/onboarding/layout.tsx"
"src/app/(auth)/onboarding/step-1/page.tsx"
"src/app/(auth)/onboarding/step-2/page.tsx"
"src/app/(auth)/onboarding/step-3/page.tsx"

"src/app/(main)/layout.tsx"
"src/app/(main)/rooms/page.tsx"
"src/app/(main)/roommates/page.tsx"
"src/app/(main)/favorites/page.tsx"
"src/app/(main)/inbox/page.tsx"
"src/app/(main)/profile/page.tsx"
"src/app/(main)/universities/page.tsx"

"src/components"
"src/lib/firebase"
"src/hooks"
"src/context"
"src/types"

"src/lib/firebase/client.ts"
"src/lib/firebase/admin.ts"
"src/lib/firebase/auth.ts"
"src/lib/firebase/firestore.ts"
"src/lib/firebase/storage.ts"

"src/middleware.ts"

"public/images"
"package.json"
"tsconfig.json"
"tailwind.config.ts"
"next.config.ts"
"components.json"
)

echo "================================="
echo " RoommateKZ Structure Check"
echo "================================="
echo

missing=0

for item in "${required[@]}"; do
    if [ -e "$item" ]; then
        echo "✅ $item"
    else
        echo "❌ MISSING: $item"
        ((missing++))
    fi
done

echo
echo "================================="
if [ $missing -eq 0 ]; then
    echo "🎉 All required files/folders exist."
else
    echo "⚠️  Missing items: $missing"
fi
echo "================================="
