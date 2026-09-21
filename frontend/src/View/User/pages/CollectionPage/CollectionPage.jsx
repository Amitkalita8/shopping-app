import CollectionPageLayout from '../../components/CollectionPageLayout';

// One page for every collection: the title, description and products all come from the API.
function CollectionPage({ collection, ...props }) {
  return <CollectionPageLayout collection={collection} {...props} />;
}

export default CollectionPage;
