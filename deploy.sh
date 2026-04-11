#!/bin/bash
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH
cd "/Users/yalkongs/Library/Mobile Documents/com~apple~CloudDocs/UPDOWNGame"
vercel --prod --yes --no-color > /tmp/vercel_deploy.log 2>&1
echo "EXIT:$?" >> /tmp/vercel_deploy.log
