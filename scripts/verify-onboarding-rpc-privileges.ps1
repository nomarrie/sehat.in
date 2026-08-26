$ErrorActionPreference = 'Stop'

$innerSignature = 'public.edge_complete_onboarding(uuid,text,integer,numeric,numeric,numeric,numeric,text,text,boolean,time without time zone,boolean,text)'
$publicSignature = 'public.edge_complete_onboarding(uuid,text,integer,numeric,numeric,numeric,numeric,text,text,boolean,time without time zone,boolean,text,boolean,text)'
$privilegeQuery = "SELECT has_function_privilege('project_admin', '$innerSignature', 'EXECUTE') AS project_admin_can_execute_inner, has_function_privilege('project_admin', '$publicSignature', 'EXECUTE') AS project_admin_can_execute_public, has_function_privilege('anon', '$innerSignature', 'EXECUTE') AS anon_can_execute_inner, has_function_privilege('authenticated', '$innerSignature', 'EXECUTE') AS authenticated_can_execute_inner, has_function_privilege('anon', '$publicSignature', 'EXECUTE') AS anon_can_execute_public, has_function_privilege('authenticated', '$publicSignature', 'EXECUTE') AS authenticated_can_execute_public"

$rawResult = & npx.cmd -y '@insforge/cli' db query $privilegeQuery --json 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Privilege query failed with exit code $LASTEXITCODE."
}

$rawText = $rawResult -join [Environment]::NewLine
$jsonStart = $rawText.IndexOf('{')
$jsonEnd = $rawText.LastIndexOf('}')
if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
  throw 'Privilege query did not return a JSON result.'
}

$queryResult = $rawText.Substring($jsonStart, $jsonEnd - $jsonStart + 1) | ConvertFrom-Json
$privileges = $queryResult.rows | Select-Object -First 1
if (-not $privileges) {
  throw 'Privilege query returned no rows.'
}

if (-not $privileges.project_admin_can_execute_inner) {
  throw 'project_admin must be able to execute the inner onboarding RPC.'
}

if (-not $privileges.project_admin_can_execute_public) {
  throw 'project_admin must be able to execute the public onboarding RPC.'
}

if (
  $privileges.anon_can_execute_inner -or
  $privileges.authenticated_can_execute_inner -or
  $privileges.anon_can_execute_public -or
  $privileges.authenticated_can_execute_public
) {
  throw 'Onboarding RPCs must remain unavailable to anon and authenticated roles.'
}

Write-Output 'Onboarding RPC privilege contract verified.'
