	<link rel="icon" type="image/x-icon" href="<?php echo $favicon; ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

<!-- Google Tag Manager (minimal) -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WG82DWL6');
</script>
<!-- End Google Tag Manager -->
    
	<?php  if (empty($metapic)) {
    if (!empty($headerpic)) {
        $metapic = $headerpic;
    } else {
        $metapic = ''; // ya koi default image URL
    } } ?>

	<?php $canonical_url = "https://www.tutorarc.com" . strtok($_SERVER["REQUEST_URI"], '?'); ?>
	<link rel="canonical" href="<?php echo htmlspecialchars($canonical_url, ENT_QUOTES, 'UTF-8'); ?>" />
	
<!-- Meta Description -->
<meta name="description" content="<?php echo htmlspecialchars($metadescription, ENT_QUOTES, 'UTF-8'); ?>" />
<meta name="keywords" content="<?php echo htmlspecialchars($metakeywords, ENT_QUOTES, 'UTF-8'); ?>" />

<!-- Open Graph / Facebook -->
<meta property="og:title" content="<?php echo htmlspecialchars($metatitle, ENT_QUOTES, 'UTF-8'); ?>" />
<meta property="og:description" content="<?php echo htmlspecialchars($metadescription, ENT_QUOTES, 'UTF-8'); ?>" />
<meta property="og:url" content="<?php echo htmlspecialchars($canonical_url, ENT_QUOTES, 'UTF-8'); ?>" />
<meta property="og:type" content="website" />
<meta property="og:image" content="<?php echo htmlspecialchars($metapic, ENT_QUOTES, 'UTF-8'); ?>" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" 		    content="@tutorarc">
<meta name="twitter:title" content="<?php echo htmlspecialchars($metatitle, ENT_QUOTES, 'UTF-8'); ?>" />
<meta name="twitter:description" content="<?php echo htmlspecialchars($metadescription, ENT_QUOTES, 'UTF-8'); ?>" />
<meta name="twitter:image" content="<?php echo htmlspecialchars($metapic, ENT_QUOTES, 'UTF-8'); ?>" />
<meta name="twitter:image:alt" 		content="<?php echo $metatitle ?>">

	
	
	<!-- Chrome, Firefox OS and Opera -->
	<meta name="theme-color" content="<?php echo $greencolor ?>">
	<!-- Windows Phone -->
	<meta name="msapplication-navbutton-color" content="<?php echo $greencolor ?>">
	<!-- iOS Safari -->
	<meta name="apple-mobile-web-app-status-bar-style" content="<?php echo $greencolor ?>">
	
	


	  <meta name="p:domain_verify" content=""/>
	  <meta name="yandex-verification" content="" />
	  <meta name="msvalidate.01" content="" />
	  <link rel="dns-prefetch" href="https://connect.facebook.net">
	  <link rel="dns-prefetch" href="https://www.google-analytics.com">
	  <link rel="preconnect" href="https://googleads.g.doubleclick.net">
	  <link rel="preconnect" href="https://www.googletagmanager.com">
	  <link rel="preconnect" href="https://www.googleadservices.com">
	
	<meta http-equiv="cache-control" content="no-cache">
	<meta http-equiv="pragma" content="no-cache">
	<meta name="author" content="Shiv Anand">
	<meta name="resource-type" content="document">
	<meta name="distribution" content="GLOBAL">
	 
	
	<!-- For 404.php page -->
	<?php if (!empty($page404) && $page404 == "1") { 
    echo '<meta name="robots" content="noindex, follow">'; } else { echo '<meta name="robots" content="index, follow">'; }  ?>

	<meta name="rating" content="general">
	<meta name="revisit-after" content="1 day">
	
	
	
	<script type="application/ld+json">
	{
	  "@context":"https://schema.org",
	  "@type":"Organization",
	  "name":"TutorArc Digital",
	  "url":"https://www.tutorarc.com",
	  "legalName":"Unique TutorArc Pvt. Ltd.",
	  "foundingDate":"2010",
	  "founder":{"@type":"Person","name":"Dr. Shiv Anand"},
	  "sameAs":["https://www.facebook.com/tutorarc","https://www.linkedin.com/company/tutorarc"],
	  "description":"Centralized education ecosystem for exam prep, tutoring, colleges, and scholarships.",
	  "potentialAction": {
		"@type": "SearchAction",
		"target": "https://www.tutorarc.com/explore/{search_term_string}",
		"query-input": "required name=search_term_string"
		}
	}
	</script>
	
	



<?php /*?><script>
(function(){
    function getCookie(name){
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? decodeURIComponent(m[2]) : null;
    }

    const gdpr = getCookie('tutorarc_gdpr');
    let pref = null;
    if(gdpr){
        try{ pref = JSON.parse(gdpr); } catch(e){ pref = null; }
    }

    if(pref && pref.analytics === true){
        // Google Tag Manager 
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
	new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
	j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
	'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
	})(window,document,'script','dataLayer','GTM-WG82DWL6');
       // End Google Tag Manager
	   
	   
        // Google analytics
        const gtagScript = document.createElement('script');
        gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-HBXTEEDZG4";
        gtagScript.async = true;
        document.head.appendChild(gtagScript);
        gtagScript.onload = function(){
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HBXTEEDZG4');
			// end Google analytics
        }
    }
})();
</script>
<?php */?>
	
	
<?php
// Check GDPR cookie
$gdprCookie = isset($_COOKIE['tutorarc_gdpr']) ? json_decode($_COOKIE['tutorarc_gdpr'], true) : null;

if($gdprCookie && isset($gdprCookie['analytics']) && $gdprCookie['analytics'] === true) {
    // Only run tracking if user accepted analytics
   $page_url = "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
		$refer_url = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'Same URL Action';
		
		$trackname = isset($_COOKIE['trackname']) ? $_COOKIE['trackname'] : 'Guest';
		$trackcontact = isset($_COOKIE['trackcontact']) ? $_COOKIE['trackcontact'] : '';
		
	if (!isset($_COOKIE[$cookieName])) {
		$deviceId = bin2hex(random_bytes(16));
		setcookie($cookieName, $deviceId, $cookieExpiry, "/", "", true, true);
	
		$stmtu = $con->prepare("INSERT INTO `$track_tableu` (deviceid, page_name, page_url, refer_url, city, state, postal, country, ip_address, rd, timestamp, name, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
		$stmtu->bind_param("sssssssssssss", $deviceId, $pagename, $page_url, $refer_url, $city, $state, $postal, $country, $ipa, $newrd, $timestamp, $trackname, $trackcontact);
		$stmtu->execute(); 
		$stmtu->close();
		
	} else {
		// Cookie is set, retrieve the value
		$deviceId = $_COOKIE[$cookieName];
		
		$stmtu = $con->prepare("INSERT INTO `$track_table` (deviceid, page_name, page_url, refer_url, city, state, postal, country, ip_address, rd, timestamp, name, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
		$stmtu->bind_param("sssssssssssss", $deviceId, $pagename, $page_url, $refer_url, $city, $state, $postal, $country, $ipa, $newrd, $timestamp, $trackname, $trackcontact);
		$stmtu->execute(); 
		$stmtu->close();
	}
}
?>

