<?php return array(
    'root' => array(
        'pretty_version' => '1.0.0+no-version-set',
        'version' => '1.0.0.0',
        'type' => 'library',
        'install_path' => __DIR__ . '/../../',
        'aliases' => array(),
        'reference' => NULL,
        'name' => '__root__',
        'dev' => true,
    ),
    'versions' => array(
        '__root__' => array(
            'pretty_version' => '1.0.0+no-version-set',
            'version' => '1.0.0.0',
            'type' => 'library',
            'install_path' => __DIR__ . '/../../',
            'aliases' => array(),
            'reference' => NULL,
            'dev_requirement' => false,
        ),
        'roots/soil' => array(
            'pretty_version' => '4.1.1',
            'version' => '4.1.1.0',
            'type' => 'wordpress-plugin',
            'install_path' => __DIR__ . '/../roots/soil',
            'aliases' => array(),
            'reference' => 'e8e15c29f01414f86610445be8f7274b8b9a73b8',
            'dev_requirement' => false,
        ),
    ),
);
